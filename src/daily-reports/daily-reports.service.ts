import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, Prisma } from '@prisma/client';
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

  private async getUsersWithRoles(role_names: string[]): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: { deleted_at: null, role: { name: { in: role_names } } },
      select: { user_id: true },
    });
    return [...new Set(assignments.map((a) => a.user_id))];
  }

  private getScopeIdsByRole(
    roles_context: any,
    role_name: string,
    scope_type: string,
  ): number[] {
    return roles_context.roles
      .filter(
        (r: any) =>
          r.name === role_name &&
          r.scope_type === scope_type &&
          r.scope_id != null,
      )
      .map((r: any) => r.scope_id as number);
  }

  private async getManagedTeams(user_id: number): Promise<number[]> {
    const roles = await this.roleAssignment.getUserRoles(user_id);
    return this.getScopeIdsByRole(roles, ROLE_NAMES.TEAM_LEADER, 'TEAM');
  }

  private async getManagedProjects(user_id: number): Promise<number[]> {
    const roles = await this.roleAssignment.getUserRoles(user_id);
    return this.getScopeIdsByRole(roles, ROLE_NAMES.PROJECT_MANAGER, 'PROJECT');
  }

  private async getManagedDivisions(user_id: number): Promise<number[]> {
    const roles = await this.roleAssignment.getUserRoles(user_id);
    return this.getScopeIdsByRole(roles, ROLE_NAMES.DIVISION_HEAD, 'DIVISION');
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

  private async buildAccessWhere(
    user_id: number,
  ): Promise<Prisma.daily_reportsWhereInput> {
    if (await this.isAdmin(user_id)) return {};

    const roles = await this.roleAssignment.getUserRoles(user_id);
    const whereConditions: Prisma.daily_reportsWhereInput[] = [];

    const divisionIds = this.getScopeIdsByRole(
      roles,
      ROLE_NAMES.DIVISION_HEAD,
      'DIVISION',
    );
    if (divisionIds.length > 0) {
      whereConditions.push({ project: { division_id: { in: divisionIds } } });
    }

    const teamIds = this.getScopeIdsByRole(
      roles,
      ROLE_NAMES.TEAM_LEADER,
      'TEAM',
    );
    if (teamIds.length > 0) {
      whereConditions.push({ project: { team_id: { in: teamIds } } });
    }

    const projectIds = this.getScopeIdsByRole(
      roles,
      ROLE_NAMES.PROJECT_MANAGER,
      'PROJECT',
    );
    if (projectIds.length > 0) {
      whereConditions.push({ project_id: { in: projectIds } });
    }

    whereConditions.push({ user_id: user_id });

    if (whereConditions.length === 1) return { user_id: user_id };
    return { OR: whereConditions };
  }

  private async canApprove(
    approverId: number,
    reportOwnerId: number,
    projectId: number,
  ): Promise<boolean> {
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId, deleted_at: null },
      select: { team_id: true, division_id: true },
    });

    if (!project) return false;

    const [approverRoles, ownerRoles] = await Promise.all([
      this.roleAssignment.getUserRoles(approverId),
      this.roleAssignment.getUserRoles(reportOwnerId),
    ]);

    const isAdmin = approverRoles.roles.some(
      (r) => r.name === ROLE_NAMES.ADMIN,
    );
    if (isAdmin) {
      if (approverId === reportOwnerId) return true;
      return ownerRoles.roles.some((r) => r.name === ROLE_NAMES.DIVISION_HEAD);
    }

    const isProjectManagerOfThisProject = approverRoles.roles.some(
      (r) =>
        r.name === ROLE_NAMES.PROJECT_MANAGER &&
        r.scope_type === 'PROJECT' &&
        r.scope_id === projectId,
    );
    if (isProjectManagerOfThisProject) return true;

    if (project.team_id) {
      const isTeamLeaderOfThisTeam = approverRoles.roles.some(
        (r) =>
          r.name === ROLE_NAMES.TEAM_LEADER &&
          r.scope_type === 'TEAM' &&
          r.scope_id === project.team_id,
      );
      if (isTeamLeaderOfThisTeam) return true;
    }

    if (project.division_id) {
      const isDivisionHeadOfThisDivision = approverRoles.roles.some(
        (r) =>
          r.name === ROLE_NAMES.DIVISION_HEAD &&
          r.scope_type === 'DIVISION' &&
          r.scope_id === project.division_id,
      );
      if (isDivisionHeadOfThisDivision) return true;
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
      select: { project_access_type: true, team_id: true, division_id: true },
    });

    if (!project) return false;
    if (project.project_access_type === 'COMPANY') return true;

    const { roles } = await this.roleAssignment.getUserRoles(user_id);
    if (roles.some((r) => r.name === ROLE_NAMES.ADMIN)) return true;

    if (
      project.team_id &&
      roles.some(
        (r) => r.scope_type === 'TEAM' && r.scope_id === project.team_id,
      )
    ) {
      return true;
    }

    if (
      project.division_id &&
      roles.some(
        (r) =>
          r.scope_type === 'DIVISION' && r.scope_id === project.division_id,
      )
    ) {
      return true;
    }

    return roles.some(
      (r) =>
        r.name === ROLE_NAMES.PROJECT_MANAGER &&
        r.scope_type === 'PROJECT' &&
        r.scope_id === project_id,
    );
  }

  private async getProjectOrThrow(project_id: number) {
    const project = await this.prisma.projects.findUnique({
      where: { id: project_id, deleted_at: null },
    });
    if (!project) {
      throw new NotFoundException(DAILY_REPORT_ERRORS.PROJECT_NOT_FOUND);
    }
    return project;
  }

  private async getReportOrThrow(id: number) {
    const report = await this.prisma.daily_reports.findFirst({ where: { id } });
    if (!report) {
      throw new NotFoundException(DAILY_REPORT_ERRORS.DAILY_REPORT_NOT_FOUND);
    }
    return report;
  }

  private validateReportOwnership(
    report: any,
    user_id: number,
    errorMessage: string,
  ) {
    if (report.user_id !== user_id) {
      throw new ForbiddenException(errorMessage);
    }
  }

  private validateReportStatus(
    report: any,
    expectedStatus: ApprovalStatus,
    errorMessage: string,
  ) {
    if (report.status !== expectedStatus) {
      throw new BadRequestException(errorMessage);
    }
  }

  private async checkDuplicateReport(
    user_id: number,
    project_id: number,
    work_date: Date,
  ) {
    const existingReport = await this.prisma.daily_reports.findFirst({
      where: { user_id, project_id, work_date },
    });
    if (existingReport) {
      throw new BadRequestException(DAILY_REPORT_ERRORS.DUPLICATE_REPORT);
    }
  }

  async create(dto: CreateDailyReportDto, user_id: number) {
    await this.getProjectOrThrow(dto.project_id);
    const workDate = new Date(dto.work_date);

    if (!this.isWorkDateInCurrentWeek(workDate)) {
      throw new BadRequestException(
        DAILY_REPORT_ERRORS.WORK_DATE_NOT_IN_CURRENT_WEEK,
      );
    }

    if (!(await this.isUserInProject(user_id, dto.project_id))) {
      throw new ForbiddenException(DAILY_REPORT_ERRORS.USER_NOT_IN_PROJECT);
    }

    await this.checkDuplicateReport(user_id, dto.project_id, workDate);

    return await this.prisma.daily_reports.create({
      data: {
        user_id,
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

    if (pagination.user_id) where.user_id = pagination.user_id;
    if (pagination.project_id) where.project_id = pagination.project_id;
    if (pagination.start_date && pagination.end_date) {
      where.work_date = {
        gte: new Date(pagination.start_date),
        lte: new Date(pagination.end_date),
      };
    }
    if (pagination.status) where.status = pagination.status;

    // Filter by division_id
    if (pagination.division_id) {
      where.project = {
        ...where.project,
        division_id: pagination.division_id,
      };
    }

    // Filter users without division
    if (pagination.users_without_division) {
      where.project = {
        ...where.project,
        division_id: null,
      };
    }

    // Filter only Division Heads
    if (pagination.division_head_only) {
      const divisionHeadIds = await this.getUsersWithRoles([
        ROLE_NAMES.DIVISION_HEAD,
      ]);
      if (divisionHeadIds.length > 0) {
        where.user_id = { in: divisionHeadIds };
      } else {
        // No division heads found, return empty result
        where.user_id = -1;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.daily_reports.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                },
              },
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              division_id: true,
              team_id: true,
            },
          },
          approved_by_user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
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
    return this.findAll({ ...pagination, user_id }, user_id);
  }

  async findOne(id: number) {
    return await this.getReportOrThrow(id);
  }

  async update(id: number, dto: UpdateDailyReportDto, user_id: number) {
    const report = await this.getReportOrThrow(id);
    this.validateReportOwnership(
      report,
      user_id,
      DAILY_REPORT_ERRORS.UNAUTHORIZED_UPDATE,
    );
    this.validateReportStatus(
      report,
      ApprovalStatus.REJECTED,
      DAILY_REPORT_ERRORS.CANNOT_UPDATE_NOT_REJECTED,
    );

    if (dto.project_id) {
      await this.getProjectOrThrow(dto.project_id);
      if (!(await this.isUserInProject(user_id, dto.project_id))) {
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
    const report = await this.getReportOrThrow(id);
    this.validateReportOwnership(
      report,
      user_id,
      DAILY_REPORT_ERRORS.UNAUTHORIZED_DELETE,
    );
    this.validateReportStatus(
      report,
      ApprovalStatus.PENDING,
      DAILY_REPORT_ERRORS.CANNOT_DELETE_NOT_PENDING,
    );
    return await this.prisma.daily_reports.delete({ where: { id } });
  }

  async approve(id: number, approverId: number) {
    const report = await this.getReportOrThrow(id);
    this.validateReportStatus(
      report,
      ApprovalStatus.PENDING,
      DAILY_REPORT_ERRORS.CANNOT_APPROVE_NOT_PENDING,
    );

    if (
      !(await this.canApprove(approverId, report.user_id, report.project_id))
    ) {
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
    const report = await this.getReportOrThrow(id);
    this.validateReportStatus(
      report,
      ApprovalStatus.PENDING,
      DAILY_REPORT_ERRORS.CANNOT_REJECT_NOT_PENDING,
    );

    if (
      !(await this.canApprove(approverId, report.user_id, report.project_id))
    ) {
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

  async approveAllByUser(userId: number, approverId: number) {
    // Get all PENDING reports of the user
    const pendingReports = await this.prisma.daily_reports.findMany({
      where: {
        user_id: userId,
        status: ApprovalStatus.PENDING,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            division_id: true,
            team_id: true,
          },
        },
      },
    });

    if (pendingReports.length === 0) {
      throw new NotFoundException(
        'Không tìm thấy daily report nào đang chờ duyệt của user này',
      );
    }

    // Check permissions for each report
    const canApproveAll = await Promise.all(
      pendingReports.map((report) =>
        this.canApprove(approverId, report.user_id, report.project_id),
      ),
    );

    const unauthorizedReports = pendingReports.filter(
      (_, index) => !canApproveAll[index],
    );

    if (unauthorizedReports.length > 0) {
      throw new ForbiddenException(
        `Không có quyền duyệt ${unauthorizedReports.length} daily report (${unauthorizedReports.map((r) => r.project.name).join(', ')})`,
      );
    }

    // Approve all reports
    const reportIds = pendingReports.map((r) => r.id);
    const result = await this.prisma.daily_reports.updateMany({
      where: {
        id: { in: reportIds },
      },
      data: {
        status: ApprovalStatus.APPROVED,
        approved_by: approverId,
        reviewed_at: new Date(),
        reject_reason: null,
      },
    });

    return {
      success: true,
      approved_count: result.count,
      message: `Đã duyệt thành công ${result.count} daily report của user ${userId}`,
      reports: pendingReports.map((r) => ({
        id: r.id,
        project_name: r.project.name,
        work_date: r.work_date,
        actual_time: r.actual_time,
      })),
    };
  }

  async approveBatch(
    reportIds: number[],
    approverId: number,
    action: 'approve' | 'reject' = 'approve',
    rejectReason?: string,
  ) {
    if (reportIds.length === 0) {
      throw new BadRequestException('Danh sách ID không được rỗng');
    }

    // Validate reject reason if action is reject
    if (action === 'reject' && (!rejectReason || rejectReason.trim().length === 0)) {
      throw new BadRequestException('Lý do từ chối không được để trống khi từ chối daily report');
    }

    // Get all reports
    const reports = await this.prisma.daily_reports.findMany({
      where: {
        id: { in: reportIds },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            division_id: true,
            team_id: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (reports.length === 0) {
      throw new NotFoundException('Không tìm thấy daily report nào');
    }

    if (reports.length !== reportIds.length) {
      const foundIds = reports.map((r) => r.id);
      const missingIds = reportIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Không tìm thấy daily report với ID: ${missingIds.join(', ')}`,
      );
    }

    // Check if all are PENDING
    const nonPendingReports = reports.filter(
      (r) => r.status !== ApprovalStatus.PENDING,
    );
    if (nonPendingReports.length > 0) {
      throw new BadRequestException(
        `${nonPendingReports.length} daily report không ở trạng thái PENDING (${nonPendingReports.map((r) => `#${r.id}`).join(', ')})`,
      );
    }

    // Check permissions for each report
    const canApproveAll = await Promise.all(
      reports.map((report) =>
        this.canApprove(approverId, report.user_id, report.project_id),
      ),
    );

    const unauthorizedReports = reports.filter(
      (_, index) => !canApproveAll[index],
    );

    if (unauthorizedReports.length > 0) {
      const actionText = action === 'approve' ? 'duyệt' : 'từ chối';
      throw new ForbiddenException(
        `Không có quyền ${actionText} ${unauthorizedReports.length} daily report: ${unauthorizedReports.map((r) => `#${r.id} (${r.user.user_information?.name || r.user.email} - ${r.project.name})`).join(', ')}`,
      );
    }

    // Update all reports (approve or reject)
    const updateData: any = {
      status: action === 'approve' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
      approved_by: approverId,
      reviewed_at: new Date(),
    };

    if (action === 'reject') {
      updateData.reject_reason = rejectReason;
    } else {
      updateData.reject_reason = null;
    }

    const result = await this.prisma.daily_reports.updateMany({
      where: {
        id: { in: reportIds },
      },
      data: updateData,
    });

    const actionText = action === 'approve' ? 'duyệt' : 'từ chối';
    const response: any = {
      success: true,
      count: result.count,
      message: `Đã ${actionText} thành công ${result.count} daily report`,
      action: action,
      reports: reports.map((r) => ({
        id: r.id,
        user_name: r.user.user_information?.name || r.user.email,
        project_name: r.project.name,
        work_date: r.work_date,
        actual_time: r.actual_time,
      })),
    };

    if (action === 'reject') {
      response.reject_reason = rejectReason;
    }

    return response;
  }


}
