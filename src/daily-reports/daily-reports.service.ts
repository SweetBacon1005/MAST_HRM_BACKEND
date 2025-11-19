import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { DAILY_REPORT_ERRORS } from '../common/constants/error-messages.constants';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { DailyReportPaginationDto } from './dto/pagination.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';

@Injectable()
export class DailyReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleAssignment: RoleAssignmentService,
  ) {}

  private async getUsersWithRoles(roleNames: string[]): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        deleted_at: null,
        role: { name: { in: roleNames } },
      },
      select: { user_id: true },
    });
    return [...new Set(assignments.map((a) => a.user_id))];
  }

  private async getManagedTeams(user_id: number): Promise<number[]> {
    const { roles } = await this.roleAssignment.getUserRoles(user_id);
    return roles
      .filter(
        (r) =>
          r.name === ROLE_NAMES.TEAM_LEADER &&
          r.scope_type === 'TEAM' &&
          r.scope_id !== null,
      )
      .map((r) => r.scope_id as number);
  }

  private async getManagedProjects(user_id: number): Promise<number[]> {
    const { roles } = await this.roleAssignment.getUserRoles(user_id);
    return roles
      .filter(
        (r) =>
          r.name === ROLE_NAMES.PROJECT_MANAGER &&
          r.scope_type === 'PROJECT' &&
          r.scope_id !== null,
      )
      .map((r) => r.scope_id as number);
  }

  private async getManagedDivisions(user_id: number): Promise<number[]> {
    const { roles } = await this.roleAssignment.getUserRoles(user_id);
    return roles
      .filter(
        (r) =>
          r.name === ROLE_NAMES.DIVISION_HEAD &&
          r.scope_type === 'DIVISION' &&
          r.scope_id !== null,
      )
      .map((r) => r.scope_id as number);
  }

  private async getTeamMembers(team_ids: number[]): Promise<number[]> {
    if (team_ids.length === 0) return [];

    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: 'TEAM',
        scope_id: { in: team_ids },
        deleted_at: null,
      },
      select: { user_id: true },
    });
    return [...new Set(assignments.map((a) => a.user_id))];
  }

  private async getDivisionMembers(division_ids: number[]): Promise<number[]> {
    if (division_ids.length === 0) return [];

    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: 'DIVISION',
        scope_id: { in: division_ids },
        deleted_at: null,
      },
      select: { user_id: true },
    });
    return [...new Set(assignments.map((a) => a.user_id))];
  }

  private async isAdmin(user_id: number): Promise<boolean> {
    const { roles } = await this.roleAssignment.getUserRoles(user_id);
    return roles.some((r) => r.name === ROLE_NAMES.ADMIN);
  }

  private async buildAccessWhere(user_id: number): Promise<any> {
    if (await this.isAdmin(user_id)) {
      return {};
    }

    const whereConditions: any[] = [];

    const [team_ids, projectIds, division_ids] = await Promise.all([
      this.getManagedTeams(user_id),
      this.getManagedProjects(user_id),
      this.getManagedDivisions(user_id),
    ]);

    if (team_ids.length > 0) {
      const memberIds = await this.getTeamMembers(team_ids);
      if (memberIds.length > 0) {
        whereConditions.push({ user_id: { in: memberIds } });
      }
    }

    if (projectIds.length > 0) {
      const projects = await this.prisma.projects.findMany({
        where: { id: { in: projectIds }, deleted_at: null },
        select: { id: true, team_id: true },
      });

      const validProjectIds = projects.map((p) => p.id);
      if (validProjectIds.length > 0) {
        whereConditions.push({ project_id: { in: validProjectIds } });
      }

      const projectteam_ids = projects
        .map((p) => p.team_id)
        .filter((id): id is number => id !== null);

      if (projectteam_ids.length > 0) {
        const teamMemberIds = await this.getTeamMembers(projectteam_ids);
        const allowedRoleUsers = await this.getUsersWithRoles([
          ROLE_NAMES.TEAM_LEADER,
          ROLE_NAMES.EMPLOYEE,
        ]);
        const allowedMembers = teamMemberIds.filter((id) =>
          allowedRoleUsers.includes(id),
        );
        if (allowedMembers.length > 0) {
          whereConditions.push({ user_id: { in: allowedMembers } });
        }
      }
    }

    if (division_ids.length > 0) {
      const divisionMemberIds = await this.getDivisionMembers(division_ids);
      const allowedRoleUsers = await this.getUsersWithRoles([
        ROLE_NAMES.PROJECT_MANAGER,
        ROLE_NAMES.TEAM_LEADER,
        ROLE_NAMES.EMPLOYEE,
      ]);
      const allowedMembers = divisionMemberIds
        .filter((id) => allowedRoleUsers.includes(id))
        .filter((id) => id !== user_id);

      if (allowedMembers.length > 0) {
        whereConditions.push({ user_id: { in: allowedMembers } });
      }

      const divisionProjects = await this.prisma.projects.findMany({
        where: { division_id: { in: division_ids }, deleted_at: null },
        select: { id: true },
      });
      const divisionProjectIds = divisionProjects.map((p) => p.id);
      if (divisionProjectIds.length > 0) {
        whereConditions.push({ project_id: { in: divisionProjectIds } });
      }
    }

    if (whereConditions.length === 0) {
      return { user_id: user_id };
    }

    return { OR: whereConditions };
  }

  private async canApprove(
    approverId: number,
    ownerId: number,
    projectId: number,
  ): Promise<boolean> {
    if (await this.isAdmin(approverId)) {
      return true;
    }

    const [approverRolesData, ownerRolesData] = await Promise.all([
      this.roleAssignment.getUserRoles(approverId),
      this.roleAssignment.getUserRoles(ownerId),
    ]);

    const approverRoles = approverRolesData.roles;
    const ownerRoleNames = ownerRolesData.roles.map((r) => r.name);

    const isTeamLeader = approverRoles.some(
      (r) => r.name === ROLE_NAMES.TEAM_LEADER,
    );
    const isProjectManager = approverRoles.some(
      (r) => r.name === ROLE_NAMES.PROJECT_MANAGER,
    );
    const isDivisionHead = approverRoles.some(
      (r) => r.name === ROLE_NAMES.DIVISION_HEAD,
    );

    if (isTeamLeader) {
      const teamLeaderteam_ids = approverRoles
        .filter(
          (r) =>
            r.name === ROLE_NAMES.TEAM_LEADER &&
            r.scope_type === 'TEAM' &&
            r.scope_id !== null,
        )
        .map((r) => r.scope_id as number);

      if (teamLeaderteam_ids.length > 0) {
        const teamMemberIds = await this.getTeamMembers(teamLeaderteam_ids);
        if (teamMemberIds.includes(ownerId)) {
          return true;
        }
      }
    }

    if (isProjectManager) {
      const projectManagerProjectIds = approverRoles
        .filter(
          (r) =>
            r.name === ROLE_NAMES.PROJECT_MANAGER &&
            r.scope_type === 'PROJECT' &&
            r.scope_id !== null,
        )
        .map((r) => r.scope_id as number);

      if (projectManagerProjectIds.includes(projectId)) {
        if (
          ownerRoleNames.includes(ROLE_NAMES.TEAM_LEADER) ||
          ownerRoleNames.includes(ROLE_NAMES.EMPLOYEE)
        ) {
          return true;
        }
      }

      if (projectManagerProjectIds.length > 0) {
        const projects = await this.prisma.projects.findMany({
          where: { id: { in: projectManagerProjectIds }, deleted_at: null },
          select: { team_id: true },
        });

        const projectteam_ids = projects
          .map((p) => p.team_id)
          .filter((id): id is number => id !== null);

        if (projectteam_ids.length > 0) {
          const teamMemberIds = await this.getTeamMembers(projectteam_ids);
          if (
            teamMemberIds.includes(ownerId) &&
            (ownerRoleNames.includes(ROLE_NAMES.TEAM_LEADER) ||
              ownerRoleNames.includes(ROLE_NAMES.EMPLOYEE))
          ) {
            return true;
          }
        }
      }
    }

    if (isDivisionHead) {
      const divisionHeaddivision_ids = approverRoles
        .filter(
          (r) =>
            r.name === ROLE_NAMES.DIVISION_HEAD &&
            r.scope_type === 'DIVISION' &&
            r.scope_id !== null,
        )
        .map((r) => r.scope_id as number);

      if (divisionHeaddivision_ids.length > 0) {
        const divisionMemberIds = await this.getDivisionMembers(
          divisionHeaddivision_ids,
        );
        if (
          divisionMemberIds.includes(ownerId) &&
          (ownerRoleNames.includes(ROLE_NAMES.PROJECT_MANAGER) ||
            ownerRoleNames.includes(ROLE_NAMES.TEAM_LEADER) ||
            ownerRoleNames.includes(ROLE_NAMES.EMPLOYEE))
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private isWorkDateInCurrentWeek(workDate: Date): boolean {
    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return workDate >= monday && workDate <= sunday;
  }

  private async isUserInProject(
    user_id: number,
    project_id: number,
  ): Promise<boolean> {
    const project = await this.prisma.projects.findUnique({
      where: { id: project_id, deleted_at: null },
      select: {
        project_access_type: true,
        team_id: true,
        division_id: true,
      },
    });

    if (!project) {
      return false;
    }

    if (project.project_access_type === 'COMPANY') {
      return true;
    }

    const { roles } = await this.roleAssignment.getUserRoles(user_id);

    if (roles.some((r) => r.name === ROLE_NAMES.ADMIN)) {
      return true;
    }

    if (project.team_id) {
      const userInTeam = roles.some(
        (r) => r.scope_type === 'TEAM' && r.scope_id === project.team_id,
      );
      if (userInTeam) {
        return true;
      }
    }

    if (project.division_id) {
      const userInDivision = roles.some(
        (r) =>
          r.scope_type === 'DIVISION' && r.scope_id === project.division_id,
      );
      if (userInDivision) {
        return true;
      }
    }

    const userIsProjectManager = roles.some(
      (r) =>
        r.name === ROLE_NAMES.PROJECT_MANAGER &&
        r.scope_type === 'PROJECT' &&
        r.scope_id === project_id,
    );
    if (userIsProjectManager) {
      return true;
    }

    return false;
  }

  async create(dto: CreateDailyReportDto, user_id: number) {
    const project = await this.prisma.projects.findUnique({
      where: { id: dto.project_id, deleted_at: null },
    });

    if (!project) {
      throw new NotFoundException(DAILY_REPORT_ERRORS.PROJECT_NOT_FOUND);
    }

    const workDate = new Date(dto.work_date);

    if (!this.isWorkDateInCurrentWeek(workDate)) {
      throw new BadRequestException(
        DAILY_REPORT_ERRORS.WORK_DATE_NOT_IN_CURRENT_WEEK,
      );
    }

    const userInProject = await this.isUserInProject(user_id, dto.project_id);
    if (!userInProject) {
      throw new ForbiddenException(DAILY_REPORT_ERRORS.USER_NOT_IN_PROJECT);
    }

    return await this.prisma.daily_reports.create({
      data: {
        user_id: user_id,
        project_id: dto.project_id,
        work_date: workDate,
        actual_time: dto.actual_time,
        title: dto.title,
        description: dto.description,
        status: ApprovalStatus.PENDING,
      },
    });
  }

  async findAll(pagination: DailyReportPaginationDto, requesterId: number) {
    const { skip, take, orderBy } = buildPaginationQuery(pagination);
    const where: any = await this.buildAccessWhere(requesterId);

    if (pagination.user_id) {
      where.user_id = pagination.user_id;
    }

    if (pagination.project_id) {
      where.project_id = pagination.project_id;
    }

    if (pagination.start_date && pagination.end_date) {
      where.work_date = {
        gte: new Date(pagination.start_date),
        lte: new Date(pagination.end_date),
      };
    }

    if (pagination.status) {
      where.status = pagination.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.daily_reports.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
      }),
      this.prisma.daily_reports.count({ where }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      pagination.page || 1,
      pagination.limit || 10,
    );
  }

  async findMy(user_id: number, pagination: DailyReportPaginationDto) {
    return this.findAll({ ...pagination, user_id: user_id }, user_id);
  }

  async findOne(id: number) {
    const report = await this.prisma.daily_reports.findFirst({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(DAILY_REPORT_ERRORS.DAILY_REPORT_NOT_FOUND);
    }

    return report;
  }

  async update(id: number, dto: UpdateDailyReportDto, user_id: number) {
    const report = await this.prisma.daily_reports.findFirst({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(DAILY_REPORT_ERRORS.DAILY_REPORT_NOT_FOUND);
    }

    if (report.user_id !== user_id) {
      throw new ForbiddenException(DAILY_REPORT_ERRORS.UNAUTHORIZED_UPDATE);
    }

    if (report.status !== ApprovalStatus.REJECTED) {
      throw new BadRequestException(
        DAILY_REPORT_ERRORS.CANNOT_UPDATE_NOT_REJECTED,
      );
    }

    if (dto.project_id) {
      const project = await this.prisma.projects.findUnique({
        where: { id: dto.project_id, deleted_at: null },
      });

      if (!project) {
        throw new NotFoundException(DAILY_REPORT_ERRORS.PROJECT_NOT_FOUND);
      }

      const userInProject = await this.isUserInProject(user_id, dto.project_id);
      if (!userInProject) {
        throw new ForbiddenException(DAILY_REPORT_ERRORS.USER_NOT_IN_PROJECT);
      }
    }

    const updateData: any = { ...dto };
    if (dto.work_date) {
      const newWorkDate = new Date(dto.work_date);
      if (!this.isWorkDateInCurrentWeek(newWorkDate)) {
        throw new BadRequestException(
          DAILY_REPORT_ERRORS.WORK_DATE_NOT_IN_CURRENT_WEEK,
        );
      }
      updateData.work_date = newWorkDate;
    }

    return await this.prisma.daily_reports.update({
      where: { id },
      data: {
        ...updateData,
        status: ApprovalStatus.PENDING,
        approved_by: null,
        reviewed_at: null,
        reject_reason: null,
      },
    });
  }

  async remove(id: number, user_id: number) {
    const report = await this.prisma.daily_reports.findFirst({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(DAILY_REPORT_ERRORS.DAILY_REPORT_NOT_FOUND);
    }

    if (report.user_id !== user_id) {
      throw new ForbiddenException(DAILY_REPORT_ERRORS.UNAUTHORIZED_DELETE);
    }

    if (report.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        DAILY_REPORT_ERRORS.CANNOT_DELETE_NOT_PENDING,
      );
    }

    return await this.prisma.daily_reports.delete({ where: { id } });
  }

  async approve(id: number, approverId: number) {
    const report = await this.findOne(id);

    if (report.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        DAILY_REPORT_ERRORS.CANNOT_APPROVE_NOT_PENDING,
      );
    }

    const canApprove = await this.canApprove(
      approverId,
      report.user_id,
      report.project_id,
    );

    if (!canApprove) {
      throw new ForbiddenException(DAILY_REPORT_ERRORS.UNAUTHORIZED_APPROVE);
    }

    return await this.prisma.daily_reports.update({
      where: { id },
      data: {
        status: ApprovalStatus.APPROVED,
        approved_by: approverId,
        reviewed_at: new Date(),
        reject_reason: null,
      },
    });
  }

  async reject(id: number, approverId: number, reason: string) {
    const report = await this.findOne(id);

    if (report.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException(
        DAILY_REPORT_ERRORS.CANNOT_REJECT_NOT_PENDING,
      );
    }

    const canApprove = await this.canApprove(
      approverId,
      report.user_id,
      report.project_id,
    );

    if (!canApprove) {
      throw new ForbiddenException(DAILY_REPORT_ERRORS.UNAUTHORIZED_APPROVE);
    }

    return await this.prisma.daily_reports.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        approved_by: approverId,
        reviewed_at: new Date(),
        reject_reason: reason,
      },
    });
  }
}
