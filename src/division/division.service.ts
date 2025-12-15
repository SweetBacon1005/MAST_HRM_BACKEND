import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ScopeType } from '@prisma/client';
import { ROLE_IDS, ROLE_NAMES } from '../auth/constants/role.constants';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { RoleHierarchyService } from '../auth/services/role-hierarchy.service';
import {
  DIVISION_ERRORS,
  SUCCESS_MESSAGES,
  TEAM_ERRORS,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import { DateFormatUtil } from '../common/utils/date-format.util';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { CreateDivisionDto } from './dto/create-division.dto';
import {
  DivisionMembersQueryDto,
  DivisionMembersSortByEnum,
} from './dto/division-members-query.dto';
import { DivisionPaginationDto } from './dto/pagination-queries.dto';
import {
  CreateRotationMemberDto,
  RotationMemberPaginationDto,
} from './dto/rotation-member.dto';
import { UpdateDivisionDto } from './dto/update-division.dto';
import {
  CreateUserDivisionDto,
  UpdateUserDivisionDto,
  UserDivisionPaginationDto,
} from './dto/user-division.dto';

@Injectable()
export class DivisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleHierarchyService: RoleHierarchyService,
    private readonly roleAssignmentService: RoleAssignmentService,
  ) {}

  private async getDivisionUser(division_id: number) {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.DIVISION,
        scope_id: division_id,
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
      },
    });
    return assignments.map((a) => ({
      id: a.user.id,
      email: a.user.email,
      name: a.user.user_information?.name || '',
    }));
  }

  private async getTeamUser(team_id: number) {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: team_id,
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
      },
    });
    return assignments.map((a) => ({
      id: a.user.id,
      email: a.user.email,
      name: a.user.user_information?.name || '',
    }));
  }

  async create(createDivisionDto: CreateDivisionDto) {
    const founding_at = new Date();

    const existingDivision = await this.prisma.divisions.findFirst({
      where: {
        name: createDivisionDto.name,
        deleted_at: null,
      },
    });

    if (existingDivision) {
      throw new BadRequestException(DIVISION_ERRORS.DIVISION_NAME_EXISTS);
    }

    const user = await this.prisma.users.findUnique({
      where: { id: createDivisionDto.leader_id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    const division = await this.prisma.divisions.create({
      data: {
        name: createDivisionDto.name,
        type: createDivisionDto.type,
        status: createDivisionDto.status,
        address: createDivisionDto.address,
        description: createDivisionDto.description,
        founding_at: founding_at,
      },
    });

    const leader = await this.prisma.user_role_assignment.create({
      data: {
        user_id: createDivisionDto.leader_id,
        scope_type: ScopeType.DIVISION,
        scope_id: division.id,
        role_id: ROLE_IDS.DIVISION_HEAD,
        assigned_by: createDivisionDto.creator_id,
        created_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
      },
    });

    return {
      ...division,
      division_head: {
        id: leader.user.id,
        email: leader.user.email,
        name: leader.user.user_information?.name || '',
      },
    };
  }

  async findAll(paginationDto: DivisionPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.divisionsWhereInput = { deleted_at: null };

    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
      };
    }

    if (paginationDto.type !== undefined) {
      where.type = paginationDto.type;
    }

    if (paginationDto.status !== undefined) {
      where.status = paginationDto.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.divisions.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          projects: {
            select: { id: true },
            where: { deleted_at: null },
          },
        },
      }),
      this.prisma.divisions.count({ where }),
    ]);

    // FIX N+1: Get all member counts in 1 query using groupBy
    const divisionIds = data.map((d) => d.id);
    const memberCounts =
      divisionIds.length > 0
        ? await this.prisma.user_role_assignment.groupBy({
            by: ['scope_id'],
            where: {
              scope_type: ScopeType.DIVISION,
              scope_id: { in: divisionIds },
              deleted_at: null,
            },
            _count: {
              user_id: true,
            },
          })
        : [];

    // Create a map for O(1) lookup
    const memberCountMap = new Map(
      memberCounts.map((mc) => [mc.scope_id, mc._count.user_id]),
    );

    // Transform data without additional queries
    const transformedData = data.map((division) => ({
      ...division,
      member_count: memberCountMap.get(division.id) || 0,
      project_count: division.projects?.length || 0,
    }));

    return buildPaginationResponse(
      transformedData,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOne(id: number) {
    const division = await this.prisma.divisions.findUnique({
      where: { id, deleted_at: null },
      include: {
        projects: {
          select: { id: true, name: true, code: true, status: true },
          where: { deleted_at: null },
        },
      },
    });

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const users = await this.getDivisionUser(id);

    const projectCount = division.projects?.length || 0;

    return {
      ...division,
      member_count: users.length,
      project_count: projectCount,
    };
  }

  async update(id: number, updateDivisionDto: UpdateDivisionDto) {
    const division = await this.prisma.divisions.findUnique({
      where: { id, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    if (updateDivisionDto.name && updateDivisionDto.name !== division.name) {
      const existingDivision = await this.prisma.divisions.findFirst({
        where: {
          name: updateDivisionDto.name,
          deleted_at: null,
          id: { not: id },
        },
      });
      if (existingDivision) {
        throw new BadRequestException(DIVISION_ERRORS.DIVISION_NAME_EXISTS);
      }
    }

    const { ...rest } = updateDivisionDto;
    const updateData: Prisma.divisionsUpdateInput = { ...rest };

    const updatedDivision = await this.prisma.divisions.update({
      where: { id },
      data: updateData,
      include: {
        projects: {
          select: { id: true },
          where: { deleted_at: null },
        },
      },
    });

    return updatedDivision;
  }

  async remove(id: number) {
    const division = await this.prisma.divisions.findUnique({
      where: { id, deleted_at: null },
      include: {
        projects: {
          where: { deleted_at: null },
        },
      },
    });

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const users = await this.getDivisionUser(id);
    if (users.length > 0) {
      throw new BadRequestException(DIVISION_ERRORS.CANNOT_DELETE_WITH_MEMBERS);
    }

    return await this.prisma.divisions.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async getDivisionHierarchy() {
    const where: Prisma.divisionsWhereInput = {
      deleted_at: null,
    };

    const divisions = await this.prisma.divisions.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        projects: {
          select: { id: true },
          where: { deleted_at: null },
        },
      },
    });

    // FIX N+1: Get all member counts in 1 query
    const divisionIds = divisions.map((d) => d.id);
    const memberCounts =
      divisionIds.length > 0
        ? await this.prisma.user_role_assignment.groupBy({
            by: ['scope_id'],
            where: {
              scope_type: ScopeType.DIVISION,
              scope_id: { in: divisionIds },
              deleted_at: null,
            },
            _count: {
              user_id: true,
            },
          })
        : [];

    const memberCountMap = new Map(
      memberCounts.map((mc) => [mc.scope_id, mc._count.user_id]),
    );

    return divisions.map((division) => ({
      ...division,
      member_count: memberCountMap.get(division.id) || 0,
    }));
  }

  async getDivisionMembers(
    division_id: number,
    queryDto: DivisionMembersQueryDto,
  ) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    if (!queryDto.roles?.includes(ROLE_NAMES.ADMIN)) {
      const userAssignment = await this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: queryDto.current_user_id,
          scope_type: ScopeType.DIVISION,
          scope_id: division_id,
          deleted_at: null,
        },
      });

      if (!userAssignment) {
        throw new NotFoundException(DIVISION_ERRORS.NOT_MANAGED_IN_DIVISION);
      }
    }

    let team: any;
    if (queryDto.team_id) {
      team = await this.prisma.teams.findFirst({
        where: {
          id: queryDto.team_id,
          division_id: division_id,
          deleted_at: null,
        },
      });
      if (!team) {
        throw new NotFoundException(TEAM_ERRORS.TEAM_NOT_IN_DIVISION);
      }
    }

    const userWhere: Prisma.usersWhereInput = {
      deleted_at: null,
      user_information: {
        deleted_at: null,
      },
    };

    if (queryDto.position_id) {
      userWhere.user_information = {
        deleted_at: null,
        position_id: queryDto.position_id,
      };
    }

    // Level filter removed - levels table no longer exists

    if (queryDto.skill_id) {
      userWhere.user_information = {
        user_skills: {
          some: {
            skill_id: queryDto.skill_id,
            deleted_at: null,
          },
        },
      };
    }

    let orderBy: Prisma.usersOrderByWithRelationInput = {
      created_at: 'desc',
    };
    if (queryDto.sort_by) {
      const sort_order = queryDto.sort_order || 'asc';
      switch (queryDto.sort_by) {
        case DivisionMembersSortByEnum.NAME:
          orderBy = { user_information: { name: sort_order } };
          break;
        case DivisionMembersSortByEnum.JOIN_DATE:
          orderBy = { created_at: sort_order };
          break;
        default:
          orderBy = { created_at: 'desc' };
      }
    }

    const [users, total, teams] = await Promise.all([
      this.prisma.users.findMany({
        where: userWhere,
        skip,
        take: limit,
        orderBy,
        include: {
          user_information: {
            where: { deleted_at: null },
            include: {
              position: {
                select: { id: true, name: true },
              },
              education: {
                select: { id: true, name: true },
              },
              experience: {
                where: { deleted_at: null },
                orderBy: { start_date: 'desc' },
              },
              user_skills: {
                where: { deleted_at: null },
                include: {
                  skill: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
          user_role_assignments: {
            where: { deleted_at: null },
            include: {
              role: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      this.prisma.users.count({
        where: userWhere,
      }),
      this.prisma.teams.findMany({
        where: { deleted_at: null },
        include: {
          division: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    const transformedData = users.map((user) => {
      const userInfo = user.user_information;
      const userTeam = user.user_role_assignments?.find(
        (ura) => ura.scope_type === ScopeType.TEAM && ura.scope_id !== null,
      );

      // Lấy tất cả role assignments của user trong division này
      const userRoleAssignments =
        user.user_role_assignments?.map((ura) => ({
          id: ura.id,
          role_id: ura.role_id,
          role_name: ura.role?.name || '',
          scope_type: ura.scope_type,
          scope_id: ura.scope_id,
          assigned_at: ura.created_at,
        })) || [];

      const skills =
        user.user_information?.user_skills?.map((us) => us.skill.name) || [];

      return {
        user_id: user.id,
        code: userInfo?.code || '',
        name: userInfo?.name || '',
        email: user.email,
        avatar: userInfo?.avatar || '',
        birthday: userInfo?.birthday || null,
        team: userTeam?.scope_id
          ? teams.find((t) => t.id === userTeam.scope_id)?.name
          : null,
        team_id: userTeam?.scope_id ?? null,
        join_date: user.created_at.toISOString().split('T')[0],
        position: userInfo?.position?.name || '',
        position_id: userInfo?.position?.id || null,
        skills: skills.join(', '),
        user_role_assignments: userRoleAssignments,
      };
    });

    return buildPaginationResponse(transformedData, total, page, limit);
  }

  async createRotationMember(
    createRotationDto: CreateRotationMemberDto,
    requesterId: number,
    roles: string[],
  ) {
    const { date_rotation, type, ...rest } = createRotationDto;

    const rotationUser = await this.prisma.users.findUnique({
      where: { id: createRotationDto.user_id, deleted_at: null },
      include: {
        user_information: true,
        user_role_assignments: {
          where: {
            scope_type: ScopeType.DIVISION,
            deleted_at: null,
          },
        },
      },
    });

    if (!rotationUser) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    const toDivision = await this.prisma.divisions.findUnique({
      where: { id: createRotationDto.division_id, deleted_at: null },
    });
    if (!toDivision) {
      throw new NotFoundException(DIVISION_ERRORS.TARGET_DIVISION_NOT_FOUND);
    }

    const currentDivisionAssignment = rotationUser?.user_role_assignments[0];

    if (!currentDivisionAssignment?.scope_id) {
      throw new BadRequestException(
        DIVISION_ERRORS.USER_NOT_ASSIGNED_TO_DIVISION,
      );
    }

    const currentDivision = await this.prisma.divisions.findUnique({
      where: { id: currentDivisionAssignment.scope_id },
      select: { id: true, name: true },
    });

    if (!currentDivision) {
      throw new BadRequestException(
        DIVISION_ERRORS.USER_NOT_ASSIGNED_TO_DIVISION,
      );
    }

    if (!roles.includes(ROLE_NAMES.ADMIN)) {
      const requester = await this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: requesterId,
          scope_id: currentDivision.id,
          scope_type: ScopeType.DIVISION,
          role_id: ROLE_IDS.DIVISION_HEAD,
          deleted_at: null,
        },
      });
      if (!requester) {
        throw new BadRequestException(DIVISION_ERRORS.CANNOT_TRANSFER_EMPLOYEE);
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Get all teams from current division
      const currentDivisionTeams = await tx.teams.findMany({
        where: {
          division_id: currentDivision.id,
          deleted_at: null,
        },
        select: { id: true },
      });

      const teamIds = currentDivisionTeams.map((t) => t.id);

      // 2. Get all projects from current division teams
      const projectIds: number[] = [];
      if (teamIds.length > 0) {
        const divisionProjects = await tx.projects.findMany({
          where: {
            OR: [
              { division_id: currentDivision.id },
              { team_id: { in: teamIds } },
            ],
            deleted_at: null,
          },
          select: { id: true },
        });
        projectIds.push(...divisionProjects.map((p) => p.id));
      }

      // 3. Create rotation record
      const rotation = await tx.rotation_members.create({
        data: {
          user_id: createRotationDto.user_id,
          from_id: currentDivision.id,
          to_id: toDivision.id,
          type,
          date_rotation: new Date(date_rotation),
        },
      });

      // 4. Remove from all teams of old division
      if (teamIds.length > 0) {
        await tx.user_role_assignment.updateMany({
          where: {
            user_id: createRotationDto.user_id,
            scope_type: ScopeType.TEAM,
            scope_id: { in: teamIds },
            deleted_at: null,
          },
          data: {
            deleted_at: new Date(),
          },
        });
      }

      // 5. Remove from all projects (PM role or team member access)
      if (projectIds.length > 0) {
        await tx.user_role_assignment.updateMany({
          where: {
            user_id: createRotationDto.user_id,
            scope_type: ScopeType.PROJECT,
            scope_id: { in: projectIds },
            deleted_at: null,
          },
          data: {
            deleted_at: new Date(),
          },
        });
      }

      // 6. Remove from old division
      await tx.user_role_assignment.updateMany({
        where: {
          user_id: createRotationDto.user_id,
          scope_type: ScopeType.DIVISION,
          scope_id: currentDivision.id,
          deleted_at: null,
        },
        data: {
          deleted_at: new Date(),
        },
      });

      // 7. Assign to new division
      await tx.user_role_assignment.create({
        data: {
          user_id: createRotationDto.user_id,
          role_id: ROLE_IDS.EMPLOYEE,
          scope_type: ScopeType.DIVISION,
          scope_id: createRotationDto.division_id,
          assigned_by: requesterId,
        },
      });

      return {
        ...rotation,
        date_rotation: rotation.date_rotation.toISOString().split('T')[0],
        from_division: currentDivision,
        removed_from: {
          teams: teamIds.length,
          projects: projectIds.length,
        },
      };
    });
  }

  async findAllRotationMembers(paginationDto: RotationMemberPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.rotation_membersWhereInput = { deleted_at: null };

    if (paginationDto.division_id) {
      where.to_id = paginationDto.division_id;
    }

    if (paginationDto.user_id) {
      where.user_id = paginationDto.user_id;
    }

    if (paginationDto.type) {
      where.type = paginationDto.type;
    }

    if (paginationDto.date_from || paginationDto.date_to) {
      where.date_rotation = {};
      if (paginationDto.date_from) {
        where.date_rotation.gte = new Date(paginationDto.date_from);
      }
      if (paginationDto.date_to) {
        where.date_rotation.lte = new Date(paginationDto.date_to);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.rotation_members.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
          to_division: {
            select: { id: true, name: true },
          },
          from_division: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.rotation_members.count({ where }),
    ]);

    const transformedData = data.map((rotation) => ({
      ...rotation,
      date_rotation: rotation.date_rotation.toISOString().split('T')[0],
    }));

    return buildPaginationResponse(
      transformedData,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOneRotationMember(id: number) {
    const rotation = await this.prisma.rotation_members.findUnique({
      where: { id, deleted_at: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } },
          },
        },
        to_division: {
          select: { id: true, name: true },
        },
        from_division: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!rotation) {
      throw new NotFoundException(DIVISION_ERRORS.ROTATION_NOT_FOUND);
    }

    return {
      ...rotation,
      date_rotation: rotation.date_rotation.toISOString().split('T')[0],
    };
  }

  async getDashboard(division_id: number, month?: number, year?: number) {
    const division = await this.prisma.divisions.findUnique({
      where: { id: division_id, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();
    const targetDate = new Date(targetYear, targetMonth - 1, 1);

    const [
      workingInfo,
      leaveRequests,
      lateInfo,
      recentBirthdayEmployees,
      attendanceStats,
    ] = await Promise.all([
      this.getWorkingInfo(division_id, targetDate),
      this.getLeaveRequestsInfo(division_id, targetDate),
      this.getLateInfo(division_id, targetDate),
      this.getRecentBirthdayEmployees(division_id, targetMonth),
      this.getAttendanceStatsByMonth(division_id, targetYear),
    ]);

    return {
      division: {
        id: division.id,
        name: division.name,
      },
      month: targetMonth,
      year: targetYear,
      working_info: workingInfo,
      leave_requests: leaveRequests,
      late_info: lateInfo,
      recent_birthday_employees: recentBirthdayEmployees,
      attendance_stats: attendanceStats,
    };
  }

  async getBirthdayEmployees(division_id: number, month?: number) {
    const division = await this.prisma.divisions.findUnique({
      where: { id: division_id, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;

    const recentBirthdayEmployees = await this.getRecentBirthdayEmployees(
      division_id,
      targetMonth,
    );

    return {
      division: {
        id: division.id,
        name: division.name,
      },
      month: targetMonth,
      employees: recentBirthdayEmployees,
    };
  }

  /**
   * API riêng cho thông tin làm việc
   */
  async getWorkInfo(division_id: number, workDate?: string) {
    const division = await this.prisma.divisions.findUnique({
      where: { id: division_id, deleted_at: null },
    });
    if (!division)
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);

    const targetDate = workDate ? new Date(workDate) : new Date();
    const dateStr =
      DateFormatUtil.formatDate(targetDate) ||
      targetDate.toISOString().split('T')[0];

    const users = await this.getDivisionUser(division_id);
    const user_ids = users.map((u) => u.id);
    const totalMembers = users.length;

    if (!totalMembers) {
      return {
        division: { id: division.id, name: division.name },
        work_date: dateStr,
        working_info: {
          total_members: 0,
          working_count: 0,
          work_date: dateStr,
          employees: [],
        },
        leave_requests: {
          paid_leave_count: 0,
          unpaid_leave_count: 0,
          employees: [],
        },
        late_info: { late_count: 0, early_count: 0, employees: [] },
      };
    }

    const userSelect = {
      select: {
        id: true,
        user_information: {
          select: {
            name: true,
            personal_email: true,
            avatar: true,
            position: true,
          },
        },
      },
    };

    const startOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
    );

    const [
      leaveEmployees,
      [paidCount, unpaidCount],
      lateEmployees,
      [lateCount, earlyCount],
      workingEmployees,
      workingCount,
    ] = await Promise.all([
      this.prisma.day_offs.findMany({
        where: {
          user_id: { in: user_ids },
          work_date: targetDate,
          status: 'APPROVED',
          deleted_at: null,
        },
        include: { user: userSelect },
      }),

      Promise.all([
        this.prisma.day_offs.count({
          where: {
            user_id: { in: user_ids },
            work_date: { gte: startOfMonth, lte: endOfMonth },
            status: 'APPROVED',
            type: 'PAID',
            deleted_at: null,
          },
        }),
        this.prisma.day_offs.count({
          where: {
            user_id: { in: user_ids },
            work_date: { gte: startOfMonth, lte: endOfMonth },
            status: 'APPROVED',
            type: { in: ['UNPAID', 'SICK', 'MATERNITY', 'PERSONAL'] },
            deleted_at: null,
          },
        }),
      ]),

      this.prisma.time_sheets.findMany({
        where: {
          user_id: { in: user_ids },
          work_date: targetDate,
          late_time: { not: null },
          deleted_at: null,
        },
        include: { user: userSelect },
      }),

      Promise.all([
        this.prisma.time_sheets.count({
          where: {
            user_id: { in: user_ids },
            work_date: { gte: startOfMonth, lte: endOfMonth },
            late_time: { gt: 0 },
            deleted_at: null,
          },
        }),
        this.prisma.time_sheets.count({
          where: {
            user_id: { in: user_ids },
            work_date: { gte: startOfMonth, lte: endOfMonth },
            early_time: { gt: 0 },
            deleted_at: null,
          },
        }),
      ]),

      this.prisma.time_sheets.findMany({
        where: {
          user_id: { in: user_ids },
          work_date: targetDate,
          checkin: { not: null },
          deleted_at: null,
        },
        include: { user: userSelect },
      }),

      this.prisma.time_sheets.count({
        where: {
          user_id: { in: user_ids },
          work_date: targetDate,
          checkin: { not: null },
          deleted_at: null,
        },
      }),
    ]);

    const leaveRequests = {
      paid_leave_count: paidCount,
      unpaid_leave_count: unpaidCount,
      employees: leaveEmployees.map((l) => ({
        user_id: l.user.id,
        name: l?.user?.user_information?.name,
        email: l?.user?.user_information?.personal_email,
        avatar: l?.user?.user_information?.avatar,
        position: l?.user?.user_information?.position,
        work_date: DateFormatUtil.formatDate(l.work_date),
        status: 'Có phép',
      })),
    };

    const lateInfo = {
      late_count: lateCount,
      early_count: earlyCount,
      employees: lateEmployees.map((ts) => ({
        user_id: ts.user.id,
        name: ts?.user?.user_information?.name,
        email: ts?.user?.user_information?.personal_email,
        avatar: ts?.user?.user_information?.avatar,
        position: ts?.user?.user_information?.position,
        checkin_time: DateFormatUtil.formatTime(ts.checkin),
        late_minutes: ts.late_time || 0,
        status: 'Không phép',
        duration: `${Math.floor((ts.late_time || 0) / 60)}h${(ts.late_time || 0) % 60}m`,
      })),
    };

    const workingInfo = {
      total_members: totalMembers,
      working_count: workingCount,
      work_date: dateStr,
      employees: workingEmployees.map((ts) => {
        const duration =
          ts.checkout && ts.checkin
            ? (() => {
                const minutes = DateFormatUtil.getDifferenceInMinutes(
                  ts.checkin,
                  ts.checkout,
                );
                return `${Math.floor(minutes / 60)}h${minutes % 60}m`;
              })()
            : 'Chưa checkout';
        return {
          user_id: ts.user.id,
          name: ts?.user?.user_information?.name,
          email: ts?.user?.user_information?.personal_email,
          avatar: ts?.user?.user_information?.avatar,
          position: ts?.user?.user_information?.position,
          checkin_time: DateFormatUtil.formatTime(ts.checkin),
          checkout_time: DateFormatUtil.formatTime(ts.checkout),
          status: ts.late_time && ts.late_time > 0 ? 'Không phép' : 'Có phép',
          duration,
        };
      }),
    };

    return {
      division: { id: division.id, name: division.name },
      work_date: dateStr,
      working_info: workingInfo,
      leave_requests: leaveRequests,
      late_info: lateInfo,
    };
  }

  async getStatistics(division_id: number, year?: number) {
    const division = await this.prisma.divisions.findUnique({
      where: { id: division_id, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const targetYear = year || new Date().getFullYear();

    const attendanceStats = await this.getAttendanceStatsByMonth(
      division_id,
      targetYear,
    );

    return {
      division: {
        id: division.id,
        name: division.name,
      },
      year: targetYear,
      attendance_stats: attendanceStats,
    };
  }

  async getLeaveEmployeeDetails(division_id: number, date?: string) {
    const division = await this.prisma.divisions.findUnique({
      where: { id: division_id, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const targetDate = date ? new Date(date) : new Date();
    const dateStr =
      DateFormatUtil.formatDate(targetDate) ||
      targetDate.toISOString().split('T')[0];

    const users = await this.getDivisionUser(division_id);
    const user_ids = users.map((u) => u.id);

    if (users.length === 0) {
      return {
        division: { id: division.id, name: division.name },
        date: dateStr,
        employees: [],
      };
    }

    const leaveEmployees = await this.prisma.day_offs.findMany({
      where: {
        user_id: { in: user_ids },
        work_date: targetDate,
        status: 'APPROVED',
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            user_information: {
              select: {
                name: true,
                avatar: true,
                position: true,
              },
            },
          },
        },
      },
    });

    const employees = leaveEmployees.map((leave) => ({
      user_id: leave.user.id,
      name: leave?.user?.user_information?.name,
      avatar: leave?.user?.user_information?.avatar,
      position: leave?.user?.user_information?.position,
      work_date: DateFormatUtil.formatDate(leave.work_date),
      status: leave.status === 'APPROVED' ? 'Có phép' : 'Không phép',
    }));

    return {
      division: { id: division.id, name: division.name },
      date: dateStr,
      employees,
    };
  }

  async getLateEmployeeDetails(division_id: number, date?: string) {
    const division = await this.prisma.divisions.findUnique({
      where: { id: division_id, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const targetDate = date ? new Date(date) : new Date();
    const dateStr =
      DateFormatUtil.formatDate(targetDate) ||
      targetDate.toISOString().split('T')[0];

    const users = await this.getDivisionUser(division_id);
    const user_ids = users.map((u) => u.id);

    if (users.length === 0) {
      return {
        division: { id: division.id, name: division.name },
        date: dateStr,
        employees: [],
      };
    }

    const lateEmployees = await this.prisma.time_sheets.findMany({
      where: {
        user_id: { in: user_ids },
        work_date: new Date(dateStr),
        late_time: { not: null },
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            user_information: {
              select: {
                name: true,
                avatar: true,
                position: true,
              },
            },
          },
        },
      },
    });

    const employees = lateEmployees.map((timesheet) => ({
      user_id: timesheet.user.id,
      name: timesheet.user.user_information?.name,
      avatar: timesheet?.user?.user_information?.avatar,
      position: timesheet?.user?.user_information?.position,
      checkin_time: DateFormatUtil.formatTime(timesheet.checkin),
      late_minutes: timesheet.late_time || 0,
      status: 'Không phép',
      duration: `${Math.floor((timesheet.late_time || 0) / 60)}h${(timesheet.late_time || 0) % 60}m`,
    }));

    return {
      division: { id: division.id, name: division.name },
      date: dateStr,
      employees,
    };
  }

  async getWorkingEmployeeDetails(division_id: number, date?: string) {
    const division = await this.prisma.divisions.findUnique({
      where: { id: division_id, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const targetDate = date ? new Date(date) : new Date();
    const dateStr =
      DateFormatUtil.formatDate(targetDate) ||
      targetDate.toISOString().split('T')[0];

    const users = await this.getDivisionUser(division_id);
    const user_ids = users.map((u) => u.id);

    if (users.length === 0) {
      return {
        division: { id: division.id, name: division.name },
        date: dateStr,
        employees: [],
      };
    }

    const workingEmployees = await this.prisma.time_sheets.findMany({
      where: {
        user_id: { in: user_ids },
        work_date: new Date(dateStr),
        checkin: { not: null },
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            user_information: {
              select: {
                name: true,
                avatar: true,
                position: true,
              },
            },
          },
        },
      },
    });

    const employees = workingEmployees.map((timesheet) => ({
      user_id: timesheet.user.id,
      name: timesheet?.user?.user_information?.name,
      avatar: timesheet?.user?.user_information?.avatar,
      position: timesheet?.user?.user_information?.position,
      checkin_time: DateFormatUtil.formatTime(timesheet.checkin),
      checkout_time: DateFormatUtil.formatTime(timesheet.checkout),
      status:
        timesheet.late_time && timesheet.late_time > 0
          ? 'Không phép'
          : 'Có phép',
      duration:
        timesheet.checkout && timesheet.checkin
          ? (() => {
              const minutes = DateFormatUtil.getDifferenceInMinutes(
                timesheet.checkin,
                timesheet.checkout,
              );
              const hours = Math.floor(minutes / 60);
              const remainingMinutes = minutes % 60;
              return `${hours}h${remainingMinutes}m`;
            })()
          : 'Chưa checkout',
    }));

    return {
      division: { id: division.id, name: division.name },
      date: dateStr,
      employees,
    };
  }

  private async getWorkingInfo(division_id: number, date: Date) {
    const dateStr =
      DateFormatUtil.formatDate(date) || date.toISOString().split('T')[0];

    const users = await this.getDivisionUser(division_id);
    const user_ids = users.map((u) => u.id);
    const totalMembers = users.length;

    if (users.length === 0) {
      return {
        total_members: 0,
        working_count: 0,
        work_date: dateStr,
      };
    }

    const workingCount = await this.prisma.time_sheets.count({
      where: {
        user_id: { in: user_ids },
        work_date: new Date(dateStr),
        checkin: { not: null },
        deleted_at: null,
      },
    });

    return {
      total_members: totalMembers,
      working_count: workingCount,
      work_date: dateStr,
    };
  }
  private async getLeaveRequestsInfo(division_id: number, date: Date) {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const users = await this.getDivisionUser(division_id);
    const user_ids = users.map((u) => u.id);

    if (users.length === 0) {
      return {
        paid_leave_count: 0,
        unpaid_leave_count: 0,
      };
    }

    const [paidCount, unpaidCount] = await Promise.all([
      this.prisma.day_offs.count({
        where: {
          user_id: { in: user_ids },
          work_date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: 'APPROVED',
          type: 'PAID',
          deleted_at: null,
        },
      }),
      this.prisma.day_offs.count({
        where: {
          user_id: { in: user_ids },
          work_date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: 'APPROVED',
          type: { in: ['UNPAID', 'SICK', 'MATERNITY', 'PERSONAL'] },
          deleted_at: null,
        },
      }),
    ]);

    return {
      paid_leave_count: paidCount,
      unpaid_leave_count: unpaidCount,
    };
  }

  private async getLateInfo(division_id: number, date: Date) {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const users = await this.getDivisionUser(division_id);
    const user_ids = users.map((u) => u.id);

    if (users.length === 0) {
      return {
        late_count: 0,
        early_count: 0,
      };
    }

    const [lateCount, earlyCount] = await Promise.all([
      this.prisma.time_sheets.count({
        where: {
          user_id: { in: user_ids },
          work_date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          late_time: { gt: 0 },
          deleted_at: null,
        },
      }),
      this.prisma.time_sheets.count({
        where: {
          user_id: { in: user_ids },
          work_date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          early_time: { gt: 0 },
          deleted_at: null,
        },
      }),
    ]);

    return {
      late_count: lateCount,
      early_count: earlyCount,
    };
  }

  private async getRecentBirthdayEmployees(division_id: number, month: number) {
    const now = new Date();

    const users = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.DIVISION,
        deleted_at: null,
        scope_id: division_id,
      },
      include: {
        user: {
          include: {
            user_information: true,
          },
        },
      },
    });

    if (users.length === 0) {
      return [];
    }

    const birthdayEmployees = users
      .filter((emp) => {
        const birthdayMonth =
          new Date(
            emp?.user?.user_information?.birthday ?? new Date(),
          ).getMonth() + 1;
        return birthdayMonth === month;
      })
      .map((emp) => {
        const birthday = new Date(
          emp?.user?.user_information?.birthday ?? new Date(),
        );
        const currentYear = now.getFullYear();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );

        const birthdayThisYear = new Date(
          currentYear,
          birthday.getMonth(),
          birthday.getDate(),
        );

        let nextBirthday;
        if (birthdayThisYear < today) {
          nextBirthday = new Date(
            currentYear + 1,
            birthday.getMonth(),
            birthday.getDate(),
          );
        } else {
          nextBirthday = birthdayThisYear;
        }

        const diffTime = nextBirthday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          user_id: emp.user_id,
          name: emp?.user?.user_information?.name,
          avatar: emp?.user.user_information?.avatar,
          birthday:
            DateFormatUtil.formatDate(emp?.user?.user_information?.birthday) ||
            emp?.user?.user_information?.birthday?.toISOString().split('T')[0],
          birthday_date: birthday?.getDate(),
          birthday_month: birthday?.getMonth() + 1,
          days_until_birthday: diffDays,
        };
      })
      .filter((emp) => emp?.days_until_birthday > 0)
      .sort((a, b) => a?.days_until_birthday - b?.days_until_birthday)
      .slice(0, 10);

    return birthdayEmployees;
  }

  private async getAttendanceStatsByMonth(division_id: number, year: number) {
    const stats: Array<{
      month: number;
      late_hours: number;
      actual_late_hours: number;
      overtime_hours: number;
    }> = [];

    const users = await this.getDivisionUser(division_id);
    const user_ids = users.map((u) => u.id);

    if (user_ids.length === 0) {
      for (let month = 1; month <= 12; month++) {
        stats.push({
          month,
          late_hours: 0,
          actual_late_hours: 0,
          overtime_hours: 0,
        });
      }
      return stats;
    }

    for (let month = 1; month <= 12; month++) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);

      const [late_minutes, actuallate_minutes, overtimeHours] =
        await Promise.all([
          this.prisma.time_sheets.aggregate({
            where: {
              user_id: { in: user_ids },
              work_date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
              late_time: { not: null },
              deleted_at: null,
            },
            _sum: {
              late_time: true,
            },
          }),
          this.prisma.time_sheets.aggregate({
            where: {
              user_id: { in: user_ids },
              work_date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
              late_time_approved: { not: null },
              deleted_at: null,
            },
            _sum: {
              late_time_approved: true,
            },
          }),
          this.prisma.over_times_history.aggregate({
            where: {
              user_id: { in: user_ids },
              work_date: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
              status: 'APPROVED',
              deleted_at: null,
            },
            _sum: {
              total_hours: true,
            },
          }),
        ]);

      stats.push({
        month,
        late_hours: Math.round((late_minutes._sum.late_time || 0) / 60),
        actual_late_hours: Math.round(
          (actuallate_minutes._sum.late_time_approved || 0) / 60,
        ),
        overtime_hours: Math.round(overtimeHours._sum.total_hours || 0),
      });
    }

    return stats;
  }

  // ========================================
  // DEPRECATED: Team methods moved to TeamModule
  // Use TeamService instead
  // ========================================

  /* DEPRECATED - Use TeamService.create()
  async createTeam(createTeamDto: CreateTeamDto, assignedBy: number) {
    const division = await this.prisma.divisions.findUnique({
      where: { id: createTeamDto.division_id, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const leader = await this.prisma.users.findUnique({
      where: { id: createTeamDto.leader_id, deleted_at: null },
    });

    if (!leader || !createTeamDto.leader_id) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    const existingTeam = await this.prisma.teams.findFirst({
      where: {
        name: createTeamDto.name,
        division_id: createTeamDto.division_id,
        deleted_at: null,
      },
    });

    if (existingTeam) {
      throw new BadRequestException(TEAM_ERRORS.TEAM_NAME_EXISTS_IN_DIVISION);
    }

    const team = await this.prisma.teams.create({
      data: {
        name: createTeamDto.name,
        division_id: createTeamDto.division_id,
        founding_date: createTeamDto.founding_date
          ? new Date(createTeamDto.founding_date)
          : new Date(),
      },
    });

    await this.prisma.user_role_assignment.create({
      data: {
        assigned_by: assignedBy,
        user_id: leader.id,
        role_id: ROLE_IDS.TEAM_LEADER,
        scope_type: ScopeType.TEAM,
        scope_id: team.id,
      },
    });

    return team;
  }
  */

  /* DEPRECATED - Use TeamService.findAll()
  async findAllTeams(paginationDto: TeamPaginationDto) {
    const {
      skip,
      take,
      orderBy: defaultOrderBy,
    } = buildPaginationQuery(paginationDto);
    
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;

    const whereConditions: Prisma.teamsWhereInput = {
      deleted_at: null,
    };

    if (paginationDto.search) {
      whereConditions.name = {
        contains: paginationDto.search,
      };
    }

    if (paginationDto.division_id) {
      whereConditions.division_id = paginationDto.division_id;
    }

    let orderBy: Prisma.teamsOrderByWithRelationInput = defaultOrderBy || {
      created_at: 'desc',
    };
    if (paginationDto.sort_by) {
      orderBy = { [paginationDto.sort_by]: paginationDto.sort_order || 'desc' };
    }

    
    const [teams, total] = await Promise.all([
      this.prisma.teams.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.teams.count({
        where: whereConditions,
      }),
    ]);

    // FIX MASSIVE N+1: Batch fetch all related data
    const teamIds = teams.map(t => t.id);
    
    if (teamIds.length === 0) {
      return buildPaginationResponse([], 0, page, limit);
    }

    // Batch 1: Get all team leaders in 1 query
    const teamLeaderAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: { in: teamIds },
        role: {
          name: 'team_leader',
          deleted_at: null,
        },
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: {
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    const teamLeaderMap = new Map(
      teamLeaderAssignments.map(tla => [
        tla.scope_id,
        tla.user ? {
          id: tla.user.id,
          name: tla.user.user_information?.name || null,
          email: tla.user.email,
          avatar: tla.user.user_information?.avatar || '',
        } : null
      ])
    );

    // Batch 2: Get all member counts in 1 query
    const memberCounts = await this.prisma.user_role_assignment.groupBy({
      by: ['scope_id'],
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: { in: teamIds },
        deleted_at: null,
      },
      _count: {
        user_id: true,
      },
    });

    const memberCountMap = new Map(
      memberCounts.map(mc => [mc.scope_id, mc._count.user_id])
    );

    // Batch 3: Get all team member user IDs
    const allTeamAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: { in: teamIds },
        deleted_at: null,
      },
      select: {
        scope_id: true,
        user_id: true,
      },
    });

    // Group user IDs by team
    const teamUserIdsMap = new Map<number, number[]>();
    allTeamAssignments.forEach(assignment => {
      if (assignment.scope_id !== null) {
        if (!teamUserIdsMap.has(assignment.scope_id)) {
          teamUserIdsMap.set(assignment.scope_id, []);
        }
        teamUserIdsMap.get(assignment.scope_id)!.push(assignment.user_id);
      }
    });

    // Get all unique user IDs
    const allUserIds = [...new Set(allTeamAssignments.map(a => a.user_id))];

    // Batch 4: Get all users with their info in 1 query
    const allUsers = allUserIds.length > 0 
      ? await this.prisma.users.findMany({
          where: {
            id: { in: allUserIds },
            deleted_at: null,
          },
          include: {
            user_information: true,
          },
        })
      : [];

    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // Batch 5: Get all projects in 1 query
    const allProjects = await this.prisma.projects.findMany({
      where: {
        team_id: { in: teamIds },
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        team_id: true,
      },
    });

    // Group projects by team
    const teamProjectsMap = new Map<number, typeof allProjects>();
    allProjects.forEach(project => {
      if (!teamProjectsMap.has(project.team_id!)) {
        teamProjectsMap.set(project.team_id!, []);
      }
      teamProjectsMap.get(project.team_id!)!.push(project);
    });

    // Transform data without additional queries
    const teamsWithDetails = teams.map(team => {
      const manager = teamLeaderMap.get(team.id) || null;
      const memberCount = memberCountMap.get(team.id) || 0;
      const teamUserIds = teamUserIdsMap.get(team.id) || [];
      const members = teamUserIds.map(userId => userMap.get(userId)).filter(Boolean) as any[];
      const activeProjects = teamProjectsMap.get(team.id) || [];

      return {
        id: team.id,
        name: team.name,
        division_id: team.division_id,
        manager: manager,
        member_count: memberCount,
        resource_by_level: members.reduce((acc, user) => {
          const levelName = user.user_information?.level?.name || 'Unknown';
          acc[levelName] = (acc[levelName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        active_projects: activeProjects.map((p) => p.name).join(', '),
        founding_date: team.founding_date,
        created_at: team.created_at,
      };
    });

    return buildPaginationResponseFromDto(
      teamsWithDetails,
      total,
      paginationDto,
    );
  }
  */

  /* DEPRECATED - Use TeamService.findOne()
  async findOneTeam(id: number) {
    const team = await this.prisma.teams.findUnique({
      where: { id, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException(TEAM_ERRORS.TEAM_NOT_FOUND);
    }

    let manager: {
      id: number;
      name: string | null;
      email: string;
      avatar: string;
      position: string;
    } | null = null;

    const teamLeaderAssignment =
      await this.prisma.user_role_assignment.findFirst({
        where: {
          scope_type: 'TEAM',
          scope_id: team.id,
          role: {
            name: 'team_leader',
            deleted_at: null,
          },
          deleted_at: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                  avatar: true,
                  position: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      });

    if (teamLeaderAssignment?.user) {
      manager = {
        id: teamLeaderAssignment.user.id,
        name: teamLeaderAssignment.user?.user_information?.name || '',
        email: teamLeaderAssignment.user.email,
        avatar: teamLeaderAssignment.user?.user_information?.avatar || '',
        position:
          teamLeaderAssignment.user?.user_information?.position?.name || '',
      };
    }

    const teamUsers = await this.getTeamUser(team.id);
    const teamuser_ids = teamUsers.map((u) => u.id);
    const memberCount = teamuser_ids.length;

    const members = await this.prisma.users.findMany({
      where: {
        id: { in: teamuser_ids },
        deleted_at: null,
      },
      include: {
        user_information: true,
      },
    });

    const activeProjects = await this.prisma.projects.findMany({
      where: {
        team_id: team.id,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return {
      id: team.id,
      name: team.name,
      division_id: team.division_id,
      manager: manager,
      member_count: memberCount,
      resource_by_level: members.reduce((acc, user) => {
        const levelName = user.user_information?.level?.name || 'Unknown';
        acc[levelName] = (acc[levelName] || 0) + 1;
        return acc;
      }, {}),
      active_projects: activeProjects,
      founding_date: team.founding_date,
      created_at: team.created_at,
      updated_at: team.updated_at,
    };
  }
  */

  /* DEPRECATED - Use TeamService.update()
  async updateTeam(id: number, updateTeamDto: UpdateTeamDto) {
    const team = await this.prisma.teams.findUnique({
      where: { id, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    if (updateTeamDto.name) {
      const existingTeam = await this.prisma.teams.findFirst({
        where: {
          name: updateTeamDto.name,
          division_id: team.division_id,
          id: { not: id },
          deleted_at: null,
        },
      });

      if (existingTeam) {
        throw new BadRequestException(TEAM_ERRORS.TEAM_NAME_EXISTS_IN_DIVISION);
      }
    }

    const updatedTeam = await this.prisma.teams.update({
      where: { id },
      data: {
        name: updateTeamDto.name,
        founding_date: updateTeamDto.founding_date
          ? new Date(updateTeamDto.founding_date)
          : undefined,
      },
    });

    return updatedTeam;
  }
  */

  /* DEPRECATED - Use TeamService.remove()
  async removeTeam(id: number) {
    const team = await this.prisma.teams.findUnique({
      where: { id, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const teamUsers = await this.getTeamUser(team.id);
    const teamuser_ids = teamUsers.map((u) => u.id);
    const memberCount = teamuser_ids.length;

    if (memberCount > 0) {
      throw new BadRequestException(
        `Không thể xóa team vì còn ${memberCount} thành viên. Vui lòng chuyển thành viên sang team khác trước.`,
      );
    }

    const projectCount = await this.prisma.projects.count({
      where: {
        team_id: id,
        deleted_at: null,
      },
    });

    if (projectCount > 0) {
      throw new BadRequestException(
        `Không thể xóa team vì còn ${projectCount} dự án. Vui lòng chuyển dự án sang team khác trước.`,
      );
    }

    await this.prisma.teams.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { message: SUCCESS_MESSAGES.TEAM_DELETED };
  }
  */

  async createUserDivision(createUserDivisionDto: CreateUserDivisionDto) {
    const { user_id, division_id, description } = createUserDivisionDto;

    const user = await this.prisma.users.findFirst({
      where: { id: user_id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    if (!division_id) {
      throw new BadRequestException(DIVISION_ERRORS.DIVISION_ID_REQUIRED);
    }

    const division = await this.prisma.divisions.findFirst({
      where: { id: division_id, deleted_at: null },
    });
    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    const existingAssignment = await this.prisma.user_role_assignment.findFirst(
      {
        where: {
          user_id: user_id,
          scope_type: ScopeType.DIVISION,
          scope_id: {
            not: null,
          },
          deleted_at: null,
        },
      },
    );

    if (existingAssignment) {
      throw new BadRequestException(DIVISION_ERRORS.USER_ALREADY_IN_DIVISION);
    }

    const defaultRole = await this.prisma.roles.findFirst({
      where: {
        name: 'employee',
        deleted_at: null,
      },
    });

    if (!defaultRole) {
      throw new NotFoundException('Không tìm thấy role mặc định');
    }

    const divisionAssignment = await this.prisma.user_role_assignment.create({
      data: {
        user_id: user_id,
        role_id: defaultRole.id,
        scope_type: ScopeType.DIVISION,
        scope_id: division_id,
        assigned_by: user_id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const [userData, divisionInfo] = await Promise.all([
      this.prisma.users.findUnique({
        where: { id: user_id },
        select: {
          id: true,
          email: true,
          user_information: {
            select: {
              name: true,
              code: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.divisions.findUnique({
        where: { id: division_id },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const userDivision = {
      id: divisionAssignment.id,
      user_id,
      division_id,
      description: description || null,
      created_at: divisionAssignment.created_at,
      updated_at: divisionAssignment.updated_at,
      user: userData,
      division: divisionInfo,
    };

    return {
      message: SUCCESS_MESSAGES.USER_ADDED_TO_DIVISION,
      data: userDivision,
    };
  }

  async findAllUserDivisions(paginationDto: UserDivisionPaginationDto = {}) {
    const { skip, take } = buildPaginationQuery(paginationDto);

    const whereConditions: Prisma.user_role_assignmentWhereInput = {
      scope_type: ScopeType.DIVISION,
      deleted_at: null,
      scope_id: { not: null },
    };

    if (paginationDto.division_id) {
      whereConditions.scope_id = paginationDto.division_id;
    }

    if (paginationDto.user_id) {
      whereConditions.user_id = paginationDto.user_id;
    }

    if (paginationDto.search) {
      whereConditions.OR = [
        {
          user: {
            user_information: {
              name: { contains: paginationDto.search },
            },
          },
        },
      ];
    }

    const assignments = await this.prisma.user_role_assignment.findMany({
      where: whereConditions,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: {
                name: true,
                code: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    const division_ids = assignments
      .map((a) => a.scope_id)
      .filter((id): id is number => id !== null);
    const divisions = await this.prisma.divisions.findMany({
      where: { id: { in: division_ids } },
      select: { id: true, name: true },
    });

    const divisionMap = new Map(divisions.map((d) => [d.id, d]));

    const user_ids = [...new Set(assignments.map((a) => a.user_id))];
    const teamAssignments = paginationDto.team_id
      ? await this.prisma.user_role_assignment.findMany({
          where: {
            user_id: { in: user_ids },
            scope_type: ScopeType.TEAM,
            scope_id: paginationDto.team_id,
            deleted_at: null,
          },
          select: { user_id: true, scope_id: true },
        })
      : await this.prisma.user_role_assignment.findMany({
          where: {
            user_id: { in: user_ids },
            scope_type: ScopeType.TEAM,
            deleted_at: null,
            scope_id: { not: null },
          },
          select: { user_id: true, scope_id: true },
        });

    const team_ids = [
      ...new Set(
        teamAssignments
          .map((ta) => ta.scope_id)
          .filter((id): id is number => id !== null),
      ),
    ];
    const teams = await this.prisma.teams.findMany({
      where: { id: { in: team_ids } },
      select: { id: true, name: true },
    });

    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const userTeamMap = new Map<number, number>();
    teamAssignments.forEach((ta) => {
      if (ta.scope_id && !userTeamMap.has(ta.user_id)) {
        userTeamMap.set(ta.user_id, ta.scope_id);
      }
    });

    const userDivisions = assignments.map((assignment) => {
      const division = assignment.scope_id
        ? divisionMap.get(assignment.scope_id)
        : null;
      const team_id = userTeamMap.get(assignment.user_id);
      const team = team_id ? teamMap.get(team_id) : null;

      return {
        id: assignment.id,
        user_id: assignment.user_id,
        division_id: assignment.scope_id || null,
        team_id: team_id || null,
        created_at: assignment.created_at,
        updated_at: assignment.updated_at,
        user: assignment.user,
        division: division || null,
        team: team || null,
      };
    });

    let filteredDivisions = userDivisions;
    if (paginationDto.search) {
      const searchLower = paginationDto.search.toLowerCase();
      filteredDivisions = userDivisions.filter(
        (ud) =>
          ud.user?.user_information?.[0]?.name
            ?.toLowerCase()
            .includes(searchLower) ||
          ud.division?.name?.toLowerCase().includes(searchLower),
      );
    }

    if (paginationDto.team_id) {
      filteredDivisions = filteredDivisions.filter(
        (ud) => ud.team_id === paginationDto.team_id,
      );
    }

    const allAssignments = await this.prisma.user_role_assignment.findMany({
      where: whereConditions,
      select: { user_id: true, scope_id: true },
    });
    const uniqueAssignments = new Set(
      allAssignments.map((a) => `${a.user_id}-${a.scope_id}`),
    );
    const total = uniqueAssignments.size;

    return buildPaginationResponse(
      filteredDivisions,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOneUserDivision(user_id: number) {
    const divisionAssignment = await this.prisma.user_role_assignment.findFirst(
      {
        where: {
          user_id: user_id,
          scope_type: ScopeType.DIVISION,
          deleted_at: null,
          scope_id: { not: null },
        },
        orderBy: { created_at: 'desc' },
      },
    );

    if (!divisionAssignment?.scope_id) {
      throw new NotFoundException(
        DIVISION_ERRORS.USER_DIVISION_ASSIGNMENT_NOT_FOUND,
      );
    }

    const teamAssignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: user_id,
        scope_type: ScopeType.TEAM,
        deleted_at: null,
        scope_id: { not: null },
      },
      orderBy: { created_at: 'desc' },
    });

    const [userData, divisionInfo, teamInfo] = await Promise.all([
      this.prisma.users.findUnique({
        where: { id: user_id },
        select: {
          id: true,
          email: true,
          user_information: {
            select: {
              name: true,
              code: true,
              avatar: true,
              position: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.divisions.findUnique({
        where: { id: divisionAssignment.scope_id },
        select: {
          id: true,
          name: true,
          description: true,
        },
      }),
      teamAssignment?.scope_id
        ? this.prisma.teams.findFirst({
            where: {
              id: teamAssignment.scope_id,
              division_id: divisionAssignment.scope_id,
              deleted_at: null,
            },
            select: {
              id: true,
              name: true,
              founding_date: true,
            },
          })
        : null,
    ]);

    if (!userData || !divisionInfo) {
      throw new NotFoundException(
        DIVISION_ERRORS.USER_DIVISION_ASSIGNMENT_NOT_FOUND,
      );
    }

    const userDivision = {
      id: divisionAssignment.id,
      user_id: user_id,
      division_id: divisionAssignment.scope_id,
      team_id: teamInfo?.id || null,
      created_at: divisionAssignment.created_at,
      updated_at: divisionAssignment.updated_at,
      user: userData,
      division: divisionInfo,
      team: teamInfo,
    };

    return {
      data: userDivision,
    };
  }

  async updateUserDivision(
    user_id: number,
    updateUserDivisionDto: UpdateUserDivisionDto,
  ) {
    const divisionAssignment = await this.prisma.user_role_assignment.findFirst(
      {
        where: {
          user_id: user_id,
          scope_type: ScopeType.DIVISION,
          deleted_at: null,
          scope_id: { not: null },
        },
        orderBy: { created_at: 'desc' },
      },
    );

    if (!divisionAssignment?.scope_id) {
      throw new NotFoundException(DIVISION_ERRORS.USER_DIVISION_NOT_FOUND);
    }

    if (updateUserDivisionDto.team_id) {
      const team = await this.prisma.teams.findFirst({
        where: {
          id: updateUserDivisionDto.team_id,
          division_id: divisionAssignment.scope_id,
          deleted_at: null,
        },
      });
      if (!team) {
        throw new NotFoundException(TEAM_ERRORS.TEAM_NOT_IN_DIVISION);
      }

      await this.prisma.user_role_assignment.updateMany({
        where: {
          user_id: user_id,
          scope_type: ScopeType.TEAM,
          deleted_at: null,
          scope_id: { not: null },
        },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      });

      const defaultRole = await this.prisma.roles.findFirst({
        where: {
          name: 'employee',
          deleted_at: null,
        },
      });

      if (defaultRole) {
        await this.prisma.user_role_assignment.create({
          data: {
            user_id: user_id,
            role_id: defaultRole.id,
            scope_type: ScopeType.TEAM,
            scope_id: updateUserDivisionDto.team_id,
            assigned_by: user_id,
          },
        });
      }
    }

    const teamAssignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: user_id,
        scope_type: ScopeType.TEAM,
        deleted_at: null,
        scope_id: { not: null },
      },
      orderBy: { created_at: 'desc' },
    });

    const [userData, divisionInfo, teamInfo] = await Promise.all([
      this.prisma.users.findUnique({
        where: { id: user_id },
        select: {
          id: true,
          email: true,
          user_information: {
            select: {
              name: true,
              code: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.divisions.findUnique({
        where: { id: divisionAssignment.scope_id },
        select: {
          id: true,
          name: true,
        },
      }),
      teamAssignment?.scope_id
        ? this.prisma.teams.findUnique({
            where: { id: teamAssignment.scope_id },
            select: {
              id: true,
              name: true,
            },
          })
        : null,
    ]);

    const updatedUserDivision = {
      id: divisionAssignment.id,
      user_id: user_id,
      division_id: divisionAssignment.scope_id,
      team_id: teamInfo?.id || updateUserDivisionDto.team_id || null,
      created_at: divisionAssignment.created_at,
      updated_at: new Date(),
      user: userData,
      division: divisionInfo,
      team: teamInfo,
    };

    return {
      message: SUCCESS_MESSAGES.USER_DIVISION_UPDATED,
      data: updatedUserDivision,
    };
  }

  async removeUserDivision(
    user_id: number,
    currentuser_id: number,
    roles: string[],
  ) {
    let assignmentUser;
    if (!roles.includes(ROLE_NAMES.ADMIN)) {
      assignmentUser = await this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: currentuser_id,
          scope_type: ScopeType.DIVISION,
          deleted_at: null,
          scope_id: { not: null },
        },
      });
    }

    const divisionAssignment = await this.prisma.user_role_assignment.findFirst(
      {
        where: {
          user_id: user_id,
          scope_type: ScopeType.DIVISION,
          deleted_at: null,
          scope_id: { not: null },
        },
      },
    );

    if (!divisionAssignment) {
      throw new NotFoundException(DIVISION_ERRORS.USER_DIVISION_NOT_FOUND);
    }

    if (assignmentUser?.scope_id !== divisionAssignment?.scope_id) {
      throw new BadRequestException(DIVISION_ERRORS.NOT_MANAGED_IN_USER);
    }

    await this.prisma.user_role_assignment.update({
      where: { id: divisionAssignment.id },
      data: {
        deleted_at: new Date(),
      },
    });

    await this.prisma.user_role_assignment.updateMany({
      where: {
        user_id: user_id,
        scope_type: ScopeType.TEAM,
        deleted_at: null,
        scope_id: { not: null },
      },
      data: {
        deleted_at: new Date(),
      },
    });

    const removedUserDivision = {
      id: divisionAssignment.id,
      user_id: user_id,
      division_id: divisionAssignment.scope_id,
      team_id: null,
      created_at: divisionAssignment.created_at,
      updated_at: divisionAssignment.updated_at,
      deleted_at: new Date(),
    };

    return {
      message: SUCCESS_MESSAGES.USER_REMOVED_FROM_DIVISION,
      data: removedUserDivision,
    };
  }

  async getUsersByDivision(
    division_id: number,
    paginationDto: UserDivisionPaginationDto = {},
  ) {
    const { skip, take } = buildPaginationQuery(paginationDto);

    const [division, team] = await Promise.all([
      this.prisma.divisions.findFirst({
        where: { id: division_id, deleted_at: null },
        select: { id: true, name: true },
      }),
      paginationDto.team_id
        ? this.prisma.teams.findFirst({
            where: {
              id: paginationDto.team_id,
              division_id: division_id,
              deleted_at: null,
            },
            select: { id: true, name: true },
          })
        : null,
    ]);

    if (!division) {
      throw new NotFoundException(DIVISION_ERRORS.DIVISION_NOT_FOUND);
    }

    if (paginationDto.team_id && !team) {
      throw new NotFoundException(TEAM_ERRORS.TEAM_NOT_IN_DIVISION);
    }

    const userWhere: Prisma.usersWhereInput = {
      deleted_at: null,
      user_information: {
        deleted_at: null,
      },
    };

    if (paginationDto.team_id) {
      userWhere.user_role_assignments = {
        some: {
          scope_type: ScopeType.TEAM,
          scope_id: paginationDto.team_id,
          deleted_at: null,
        },
      };
    }

    if (paginationDto.search) {
      userWhere.user_information = {
        deleted_at: null,
        name: { contains: paginationDto.search },
      };
    }

    const assignmentWhere: Prisma.user_role_assignmentWhereInput = {
      scope_type: ScopeType.DIVISION,
      scope_id: division_id,
      deleted_at: null,
      user: userWhere,
    };

    const [assignments, total] = await Promise.all([
      this.prisma.user_role_assignment.findMany({
        where: assignmentWhere,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          user_id: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: {
                  name: true,
                  code: true,
                  avatar: true,
                  position: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.user_role_assignment.count({
        where: assignmentWhere,
      }),
    ]);

    const user_ids = assignments.map((a) => a.user_id);
    const teamAssignments =
      user_ids.length > 0
        ? await this.prisma.user_role_assignment.findMany({
            where: {
              user_id: { in: user_ids },
              scope_type: ScopeType.TEAM,
              deleted_at: null,
              scope_id: { not: null },
            },
            select: { user_id: true, scope_id: true },
          })
        : [];

    const team_ids = [
      ...new Set(
        teamAssignments
          .map((ta) => ta.scope_id)
          .filter((id): id is number => id !== null),
      ),
    ];
    const teams =
      team_ids.length > 0
        ? await this.prisma.teams.findMany({
            where: {
              id: { in: team_ids },
              division_id: division_id,
              deleted_at: null,
            },
            select: { id: true, name: true },
          })
        : [];

    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const userTeamMap = new Map<number, number>();
    teamAssignments.forEach((ta) => {
      if (ta.scope_id && !userTeamMap.has(ta.user_id)) {
        userTeamMap.set(ta.user_id, ta.scope_id);
      }
    });

    const userDivisions = assignments.map((assignment) => {
      const team_id = userTeamMap.get(assignment.user_id);
      const teamInfo = team_id ? teamMap.get(team_id) : null;

      return {
        id: assignment.user_id,
        user_id: assignment.user_id,
        division_id: division_id,
        team_id: team_id || null,
        created_at: assignment.created_at,
        updated_at: assignment.updated_at,
        user: {
          id: assignment.user.id,
          email: assignment.user.email,
          user_information: assignment.user.user_information,
        },
        division: {
          id: division.id,
          name: division.name,
        },
        team: teamInfo
          ? {
              id: teamInfo.id,
              name: teamInfo.name,
            }
          : null,
      };
    });

    return buildPaginationResponse(
      userDivisions,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async getUnassignedUsers(paginationDto: any = {}) {
    const { skip, take } = buildPaginationQuery(paginationDto);

    const whereConditions: Prisma.usersWhereInput = {
      deleted_at: null,
      user_information: {
        deleted_at: null,
      },
      user_role_assignments: {
        none: {
          scope_type: ScopeType.DIVISION,
          deleted_at: null,
          scope_id: { not: null },
        },
      },
    };

    if (paginationDto.search) {
      whereConditions.OR = [
        {
          email: { contains: paginationDto.search },
        },
        {
          user_information: {
            name: { contains: paginationDto.search },
          },
        },
        {
          user_information: {
            code: { contains: paginationDto.search },
          },
        },
      ];
    }

    if (paginationDto.position_id || paginationDto.level_id) {
      whereConditions.user_information = {
        deleted_at: null,
        ...(paginationDto.position_id && {
          position_id: paginationDto.position_id,
        }),
      };
    }

    let finalOrderBy: Prisma.usersOrderByWithRelationInput = {
      created_at: 'desc',
    };
    if (paginationDto.sort_by) {
      const sort_order = paginationDto.sort_order || 'asc';
      switch (paginationDto.sort_by) {
        case 'name':
          finalOrderBy = { user_information: { name: sort_order } };
          break;
        case 'email':
          finalOrderBy = { email: sort_order };
          break;
        case 'created_at':
          finalOrderBy = { created_at: sort_order };
          break;
        default:
          finalOrderBy = { created_at: 'desc' };
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.users.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy: finalOrderBy,
        select: {
          id: true,
          email: true,
          created_at: true,
          user_information: {
            select: {
              name: true,
              code: true,
              avatar: true,
              birthday: true,
              phone: true,
              address: true,
              position: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.users.count({ where: whereConditions }),
    ]);

    const transformedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.user_information?.name || '',
      code: user.user_information?.code || '',
      avatar: user.user_information?.avatar || '',
      birthday: user.user_information?.birthday || null,
      phone: user.user_information?.phone || '',
      address: user.user_information?.address || '',
      position: user.user_information?.position || null,
      created_at: user.created_at,
    }));

    return buildPaginationResponse(
      transformedUsers,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }
}
