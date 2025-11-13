import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';
import { DailyReportPaginationDto } from './dto/pagination.dto';
import { buildPaginationQuery, buildPaginationResponse } from '../common/utils/pagination.util';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { ROLE_NAMES } from '../auth/constants/role.constants';

@Injectable()
export class DailyReportsService {
  private async usersWithRoles(roleNames: string[]) {
    const assigns = await this.prisma.user_role_assignment.findMany({
      where: { deleted_at: null, role: { name: { in: roleNames } } },
      select: { user_id: true },
    });
    return [...new Set(assigns.map(a => a.user_id))];
  }

  private async getManagedTeams(userId: number) {
    const roles = await this.roleAssignment.getUserRoles(userId);
    return roles.roles.filter(r => r.name === ROLE_NAMES.TEAM_LEADER && r.scope_type === 'TEAM' && r.scope_id != null).map(r => r.scope_id!) as number[];
  }

  private async getManagedProjects(userId: number) {
    const roles = await this.roleAssignment.getUserRoles(userId);
    return roles.roles.filter(r => r.name === ROLE_NAMES.PROJECT_MANAGER && r.scope_type === 'PROJECT' && r.scope_id != null).map(r => r.scope_id!) as number[];
  }

  private async getManagedDivisions(userId: number) {
    const roles = await this.roleAssignment.getUserRoles(userId);
    return roles.roles.filter(r => r.name === ROLE_NAMES.DIVISION_HEAD && r.scope_type === 'DIVISION' && r.scope_id != null).map(r => r.scope_id!) as number[];
  }

  private async getTeamMembers(teamIds: number[]) {
    if (!teamIds.length) return [] as number[];
    const links = await this.prisma.user_division.findMany({ where: { teamId: { in: teamIds } }, select: { userId: true } });
    return [...new Set(links.map(l => l.userId))];
  }

  private async getDivisionMembers(divisionIds: number[]) {
    if (!divisionIds.length) return [] as number[];
    const links = await this.prisma.user_division.findMany({ where: { divisionId: { in: divisionIds } }, select: { userId: true } });
    return [...new Set(links.map(l => l.userId))];
  }

  private async isAdmin(userId: number) {
    const roles = await this.roleAssignment.getUserRoles(userId);
    return roles.roles.some(r => r.name === ROLE_NAMES.ADMIN);
  }

  private async buildAccessWhere(userId: number) {
    if (await this.isAdmin(userId)) return {} as any;
    const where: any = { OR: [] };
    const teamIds = await this.getManagedTeams(userId);
    if (teamIds.length) {
      const memberIds = await this.getTeamMembers(teamIds);
      if (memberIds.length) where.OR.push({ user_id: { in: memberIds } });
    }
    const projectIds = await this.getManagedProjects(userId);
    if (projectIds.length) {
      const projects = await this.prisma.projects.findMany({ where: { id: { in: projectIds } }, select: { id: true, team_id: true } });
      const projIds = projects.map(p => p.id);
      const projTeamIds = projects.map(p => p.team_id).filter((v): v is number => typeof v === 'number');
      if (projIds.length) where.OR.push({ project_id: { in: projIds } });
      if (projTeamIds.length) {
        const pmMemberIds = await this.getTeamMembers(projTeamIds);
        const allowedByRole = await this.usersWithRoles([ROLE_NAMES.TEAM_LEADER, ROLE_NAMES.EMPLOYEE]);
        const allowed = pmMemberIds.filter(id => allowedByRole.includes(id));
        if (allowed.length) where.OR.push({ user_id: { in: allowed } });
      }
    }
    const divisionIds = await this.getManagedDivisions(userId);
    if (divisionIds.length) {
      const divisionMemberIds = await this.getDivisionMembers(divisionIds);
      const allowedByRole = await this.usersWithRoles([ROLE_NAMES.PROJECT_MANAGER, ROLE_NAMES.TEAM_LEADER, ROLE_NAMES.EMPLOYEE]);
      const allowed = divisionMemberIds.filter(id => allowedByRole.includes(id)).filter(id => id !== userId);
      if (allowed.length) where.OR.push({ user_id: { in: allowed } });
      const projInDiv = await this.prisma.projects.findMany({ where: { division_id: { in: divisionIds } }, select: { id: true } });
      const projIds = projInDiv.map(p => p.id);
      if (projIds.length) where.OR.push({ project_id: { in: projIds } });
    }
    if (!where.OR.length) return { user_id: userId } as any;
    return where;
  }

  private async canApprove(approverId: number, ownerId: number, projectId: number) {
    if (approverId === ownerId) return false;
    if (await this.isAdmin(approverId)) return true;
    const approverRoles = (await this.roleAssignment.getUserRoles(approverId)).roles.map(r => ({ name: r.name, scope_type: r.scope_type, scope_id: r.scope_id }));
    const ownerRoles = (await this.roleAssignment.getUserRoles(ownerId)).roles.map(r => r.name);
    const isTL = approverRoles.some(r => r.name === ROLE_NAMES.TEAM_LEADER);
    const isPM = approverRoles.some(r => r.name === ROLE_NAMES.PROJECT_MANAGER);
    const isDH = approverRoles.some(r => r.name === ROLE_NAMES.DIVISION_HEAD);
    if (isTL) {
      const tlTeams = approverRoles.filter(r => r.name === ROLE_NAMES.TEAM_LEADER && r.scope_type === 'TEAM' && r.scope_id != null).map(r => r.scope_id!) as number[];
      if (tlTeams.length) {
        const memberIds = await this.getTeamMembers(tlTeams);
        if (memberIds.includes(ownerId)) return true;
      }
    }
    if (isPM) {
      const pmProjects = approverRoles.filter(r => r.name === ROLE_NAMES.PROJECT_MANAGER && r.scope_type === 'PROJECT' && r.scope_id != null).map(r => r.scope_id!) as number[];
      if (pmProjects.includes(projectId)) {
        if (ownerRoles.includes(ROLE_NAMES.TEAM_LEADER) || ownerRoles.includes(ROLE_NAMES.EMPLOYEE)) return true;
      } else {
        const projects = await this.prisma.projects.findMany({ where: { id: { in: pmProjects } }, select: { team_id: true } });
        const pmTeamIds = projects.map(p => p.team_id).filter((v): v is number => typeof v === 'number');
        if (pmTeamIds.length) {
          const memberIds = await this.getTeamMembers(pmTeamIds);
          if (memberIds.includes(ownerId) && (ownerRoles.includes(ROLE_NAMES.TEAM_LEADER) || ownerRoles.includes(ROLE_NAMES.EMPLOYEE))) return true;
        }
      }
    }
    if (isDH) {
      const dhDivs = approverRoles.filter(r => r.name === ROLE_NAMES.DIVISION_HEAD && r.scope_type === 'DIVISION' && r.scope_id != null).map(r => r.scope_id!) as number[];
      if (dhDivs.length) {
        const memberIds = await this.getDivisionMembers(dhDivs);
        if (memberIds.includes(ownerId) && (ownerRoles.includes(ROLE_NAMES.PROJECT_MANAGER) || ownerRoles.includes(ROLE_NAMES.TEAM_LEADER) || ownerRoles.includes(ROLE_NAMES.EMPLOYEE))) return true;
      }
    }
    return false;
  }
  constructor(private prisma: PrismaService, private roleAssignment: RoleAssignmentService) {}

  async create(dto: CreateDailyReportDto, userId: number) {
    const workDate = new Date(dto.work_date);
    return await this.prisma.daily_reports.create({
      data: {
        user_id: userId,
        project_id: dto.project_id,
        work_date: workDate,
        actual_time: dto.actual_time,
        title: dto.title,
        description: dto.description,
        status: ApprovalStatus.PENDING,
      },
    });
  }

  async findAll(p: DailyReportPaginationDto, requesterId: number) {
    const { skip, take, orderBy } = buildPaginationQuery(p);
    const where: any = await this.buildAccessWhere(requesterId);
    if (p.user_id) where.user_id = p.user_id;
    if (p.project_id) where.project_id = p.project_id;
    if (p.start_date && p.end_date) where.work_date = { gte: new Date(p.start_date), lte: new Date(p.end_date) };
    if (p.status) where.status = p.status as any;
    const [data, total] = await Promise.all([
      this.prisma.daily_reports.findMany({ where, skip, take, orderBy: orderBy || { created_at: 'desc' } }),
      this.prisma.daily_reports.count({ where }),
    ]);
    return buildPaginationResponse(data, total, p.page || 1, p.limit || 10);
  }

  async findMy(userId: number, p: DailyReportPaginationDto) {
    return this.findAll({ ...p, user_id: userId });
  }

  async findOne(id: number) {
    const report = await this.prisma.daily_reports.findFirst({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm th?y daily report');
    return report;
  }

  async update(id: number, dto: UpdateDailyReportDto, userId: number) {
    const existing = await this.prisma.daily_reports.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm th?y daily report');
    if (existing.user_id !== userId) throw new ForbiddenException('Không có quy?n');
    if (existing.status !== ApprovalStatus.REJECTED) throw new BadRequestException('Ch? du?c s?a khi REJECTED');
    const data: any = { ...dto };
    if (dto.work_date) data.work_date = new Date(dto.work_date);
    return await this.prisma.daily_reports.update({ where: { id }, data: { ...data, status: ApprovalStatus.PENDING, approved_by: null, reviewed_at: null, reject_reason: null } });
  }

  async remove(id: number, userId: number) {
    const existing = await this.prisma.daily_reports.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm th?y daily report');
    if (existing.user_id !== userId) throw new ForbiddenException('Không có quy?n');
    if (existing.status !== ApprovalStatus.PENDING) throw new BadRequestException('Ch? du?c xóa khi PENDING');
    return await this.prisma.daily_reports.delete({ where: { id } });
  }

  private async canApprove(approverId: number, ownerId: number) {
    const ownerRoles = (await this.roleAssignment.getUserRoles(ownerId)).roles.map(r => r.name);
    const approverRoles = (await this.roleAssignment.getUserRoles(approverId)).roles.map(r => r.name);
    const isPM = approverRoles.includes(ROLE_NAMES.PROJECT_MANAGER);
    const isDivisionHead = approverRoles.includes(ROLE_NAMES.DIVISION_HEAD);
    const ownerIsTL = ownerRoles.includes(ROLE_NAMES.TEAM_LEADER);
    const ownerIsEmployee = ownerRoles.includes(ROLE_NAMES.EMPLOYEE);
    const ownerIsPM = ownerRoles.includes(ROLE_NAMES.PROJECT_MANAGER);
    const ownerIsSelf = approverId === ownerId;
    const ownerIsHR = ownerRoles.includes(ROLE_NAMES.HR_MANAGER);
    if (isPM && (ownerIsTL || ownerIsEmployee)) return true;
    if (isDivisionHead && (ownerIsSelf || ownerIsPM || ownerIsHR)) return true;
    return false;
  }

  async approve(id: number, approverId: number) {
    const report = await this.findOne(id);
    if (report.status !== ApprovalStatus.PENDING) throw new BadRequestException('Daily report không ? tr?ng thái PENDING');
    const ok = await this.canApprove(approverId, report.user_id, report.project_id);
    if (!ok) throw new ForbiddenException('Không có quy?n duy?t');
    return await this.prisma.daily_reports.update({ where: { id }, data: { status: ApprovalStatus.APPROVED, approved_by: approverId, reviewed_at: new Date(), reject_reason: null } });
  }, data: { status: ApprovalStatus.APPROVED, approved_by: approverId, reviewed_at: new Date(), reject_reason: null } });
  }

  async reject(id: number, approverId: number, reason: string) {
    const report = await this.findOne(id);
    if (report.status !== ApprovalStatus.PENDING) throw new BadRequestException('Daily report không ? tr?ng thái PENDING');
    const ok = await this.canApprove(approverId, report.user_id, report.project_id);
    if (!ok) throw new ForbiddenException('Không có quy?n duy?t');
    return await this.prisma.daily_reports.update({ where: { id }, data: { status: ApprovalStatus.REJECTED, approved_by: approverId, reviewed_at: new Date(), reject_reason: reason } });
  }, data: { status: ApprovalStatus.REJECTED, approved_by: approverId, reviewed_at: new Date(), reject_reason: reason } });
  }
}



