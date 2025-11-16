import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScopeType } from '@prisma/client';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import {
  SUCCESS_MESSAGES,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersPaginationDto } from './dto/pagination-queries.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private roleAssignmentService: RoleAssignmentService,
  ) {}

  async create(createUserDto: CreateUserDto, assignedBy: number) {
    const { password, ...userData } = createUserDto;

    const user = await this.prisma.users.create({
      data: {
        email: userData.email.toLowerCase(),
        password: password,
        email_verified_at: new Date(),
        user_information: {
          create: {
            name: userData.name,
          },
        },
      },
    });

    if (userData.roleId) {
      await this.roleAssignmentService.assignRole({
        user_id: user.id,
        role_id: Number(userData.roleId),
        scope_type: ScopeType.COMPANY,
        assigned_by: assignedBy,
      });
    }

    const { password: _, ...result } = user;
    return result;
  }

  async findAll() {
    const users = await this.prisma.users.findMany({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        email_verified_at: true,
        created_at: true,
        updated_at: true,
        user_information: {
          select: {
            avatar: true,
            position: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user_role_assignments: {
          where: {
            deleted_at: null,
          },
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return users.map((user) => ({
      ...user,
      role: user.user_information?.[0]?.role,
      position: user.user_information?.[0]?.position,
      user_information: undefined,
    }));
  }

  async findAllPaginated(paginationDto: UsersPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.usersWhereInput = { deleted_at: null };

    if (paginationDto.search) {
      where.OR = [
        {
          user_information: {
            name: {
              contains: paginationDto.search,
            },
          },
        },
      ];
    }

    const userInfoFilters: Prisma.user_informationWhereInput = {};
    if (paginationDto.position_id) {
      userInfoFilters.position = {
        id: paginationDto.position_id,
      };
    }

    if (Object.keys(userInfoFilters).length > 0) {
      where.user_information = {
        ...userInfoFilters,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          email_verified_at: true,
          status: true,
          created_at: true,
          updated_at: true,
          user_information: true,
          user_role_assignments: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
              scope_id: true,
              scope_type: true,
            },
          },
          // user_division đã bị xóa, sử dụng user_role_assignment thay thế
        },
      }),
      this.prisma.users.count({ where }),
    ]);


    // Lấy division và team info từ user_role_assignment
    const userIds = data.map((u) => u.id);
    const divisionAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: { in: userIds },
        scope_type: 'DIVISION',
        deleted_at: null,
        scope_id: { not: null },
      },
      select: { user_id: true, scope_id: true },
      distinct: ['user_id'],
    });

    const teamAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: { in: userIds },
        scope_type: 'TEAM',
        deleted_at: null,
        scope_id: { not: null },
      },
      select: { user_id: true, scope_id: true },
      distinct: ['user_id'],
    });

    const divisionIds = [...new Set(divisionAssignments.map((a) => a.scope_id).filter((id): id is number => id !== null))];
    const teamIds = [...new Set(teamAssignments.map((a) => a.scope_id).filter((id): id is number => id !== null))];

    const [divisions, teams] = await Promise.all([
      this.prisma.divisions.findMany({
        where: { id: { in: divisionIds } },
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          status: true,
          type: true,
        },
      }),
      this.prisma.teams.findMany({
        where: { id: { in: teamIds } },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const divisionMap = new Map(divisions.map((d) => [d.id, d]));
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const userDivisionMap = new Map<number, number>();
    const userTeamMap = new Map<number, number>();

    divisionAssignments.forEach((a) => {
      if (a.scope_id && !userDivisionMap.has(a.user_id)) {
        userDivisionMap.set(a.user_id, a.scope_id);
      }
    });

    teamAssignments.forEach((a) => {
      if (a.scope_id && !userTeamMap.has(a.user_id)) {
        userTeamMap.set(a.user_id, a.scope_id);
      }
    });

    const transformedData = data.map((user) => {
      const divisionId = userDivisionMap.get(user.id);
      const teamId = userTeamMap.get(user.id);
      const division = divisionId ? divisionMap.get(divisionId) : null;
      const team = teamId ? teamMap.get(teamId) : null;

      return {
        ...user,
        user_division: division
          ? [
              {
                division,
                team: team || null,
              },
            ]
          : [],
      };
    });

    return buildPaginationResponse(
      transformedData,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findById(id: number) {
    const user = await this.prisma.users.findFirst({
      where: {
        id: id,
      },
      include: {
        user_information: {
          include: {
            position: true,
            level: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    const [divisionAssignment, teamAssignment] = await Promise.all([
      this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: id,
          scope_type: ScopeType.DIVISION,
          deleted_at: null,
          scope_id: { not: null },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: id,
          scope_type: ScopeType.TEAM,
          deleted_at: null,
          scope_id: { not: null },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    let division: { id: number; name: string; status: any; description: string | null; created_at: Date; updated_at: Date; deleted_at: Date | null; address: string | null; type: any; parent_id: number | null; founding_at: Date } | null = null;
    if (divisionAssignment?.scope_id) {
      division = await this.prisma.divisions.findUnique({
        where: { id: divisionAssignment.scope_id },
      });
    }

    let team: { id: number; name: string; division_id: number | null; created_at: Date; updated_at: Date; deleted_at: Date | null; founding_date: Date | null } | null = null;
    if (teamAssignment?.scope_id) {
      team = await this.prisma.teams.findUnique({
        where: { id: teamAssignment.scope_id },
      });
    }

    const roleAssignments = await this.roleAssignmentService.getUserRoles(id);

    // Format response giống như user_division cũ
    return {
      ...user,
      user_division: division
        ? [
            {
              division,
              team: team || null,
            },
          ]
        : [],
      role_assignments: roleAssignments.roles,
    };
  }

  async findByEmail(email: string) {
    return this.prisma.users.findFirst({
      where: {
        email,
        deleted_at: null,
      },
      include: {
        user_role_assignments: {
          where: {
            deleted_at: null,
          },
          include: {
            role: true,
          },
        },
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    const updatedUser = await this.prisma.users.update({
      where: { id: id },
      data: updateUserDto,
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  async remove(id: number) {
    await this.findById(id);

    await this.prisma.users.update({
      where: { id: id },
      data: { deleted_at: new Date() },
    });

    return { message: SUCCESS_MESSAGES.DELETED_SUCCESSFULLY };
  }

  async updatePassword(userId: number, hashedPassword: string) {
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });
  }
}
