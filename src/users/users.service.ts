import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScopeType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { ROLE_IDS } from '../auth/constants/role.constants';
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

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.users.create({
      data: {
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        email_verified_at: new Date(),
        user_information: {
          create: {
            name: userData.name,
          },
        },
      },
    });

    const roleIdToAssign = userData.role_id ? Number(userData.role_id) : ROLE_IDS.EMPLOYEE;
    
    await this.roleAssignmentService.assignRole({
      user_id: user.id,
      role_id: roleIdToAssign,
      scope_type: ScopeType.COMPANY,
      assigned_by: assignedBy,
    });

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
      position: user.user_information?.position,
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

    if (paginationDto.status) {
      where.status = paginationDto.status;
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

    if (paginationDto.role_id) {
      where.user_role_assignments = {
        some: {
          role_id: paginationDto.role_id,
          deleted_at: null,
        },
      };
    }

    let user_idsForDivisionFilter: number[] | undefined;
    if (paginationDto.division_id) {
      const divisionAssignments =
        await this.prisma.user_role_assignment.findMany({
          where: {
            scope_type: ScopeType.DIVISION,
            scope_id: paginationDto.division_id,
            deleted_at: null,
          },
          select: { user_id: true },
        });
      user_idsForDivisionFilter = divisionAssignments.map((a) => a.user_id);

      if (user_idsForDivisionFilter.length === 0) {
        return buildPaginationResponse(
          [],
          0,
          paginationDto.page || 1,
          paginationDto.limit || 10,
        );
      }

      where.id = { in: user_idsForDivisionFilter };
    }

    if (paginationDto.is_register_face !== undefined) {
      if (paginationDto.is_register_face === true) {
        where.register_face_url = { not: null };
        where.register_face_at = { not: null };
      } else {
        where.OR = [
          { register_face_url: null },
          { register_face_at: null },
        ];
      }
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
          register_face_url: true,
          register_face_at: true,
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
        },
      }),
      this.prisma.users.count({ where }),
    ]);

    const user_ids = data.map((u) => u.id);
    const divisionAssignments = await this.prisma.user_role_assignment.findMany(
      {
        where: {
          user_id: { in: user_ids },
          scope_type: 'DIVISION',
          deleted_at: null,
          scope_id: { not: null },
        },
        select: { user_id: true, scope_id: true },
        distinct: ['user_id'],
      },
    );

    const teamAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: { in: user_ids },
        scope_type: 'TEAM',
        deleted_at: null,
        scope_id: { not: null },
      },
      select: { user_id: true, scope_id: true },
      distinct: ['user_id'],
    });

    const division_ids = [
      ...new Set(
        divisionAssignments
          .map((a) => a.scope_id)
          .filter((id): id is number => id !== null),
      ),
    ];
    const team_ids = [
      ...new Set(
        teamAssignments
          .map((a) => a.scope_id)
          .filter((id): id is number => id !== null),
      ),
    ];

    const [divisions, teams] = await Promise.all([
      this.prisma.divisions.findMany({
        where: { id: { in: division_ids } },
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
        where: { id: { in: team_ids } },
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
      const division_id = userDivisionMap.get(user.id);
      const team_id = userTeamMap.get(user.id);
      const division = division_id ? divisionMap.get(division_id) : null;
      const team = team_id ? teamMap.get(team_id) : null;

      return {
        ...user,
        user_division: division
          ? {
              division,
              team: team || null,
            }
          : null,
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
        deleted_at: null,
      },
      include: {
        user_information: true,
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

    let division: {
      id: number;
      name: string;
      status: any;
      description: string | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
      address: string | null;
      type: any;
      founding_at: Date;
    } | null = null;
    if (divisionAssignment?.scope_id) {
      division = await this.prisma.divisions.findUnique({
        where: { id: divisionAssignment.scope_id },
      });
    }

    let team: {
      id: number;
      name: string;
      division_id: number | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
      founding_date: Date | null;
    } | null = null;
    if (teamAssignment?.scope_id) {
      team = await this.prisma.teams.findUnique({
        where: { id: teamAssignment.scope_id },
      });
    }

    const roleAssignments = await this.roleAssignmentService.getUserRoles(id);

    return {
      ...user,
      user_division: division
        ? {
            division,
            team: team || null,
          }
        : null,
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

  async update(id: number, updateUserDto: UpdateUserDto, updatedBy: number) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    // Loại bỏ password nếu có ai cố gắng gửi (bảo mật)
    const { password: _password, name, ...safeUpdateData } = updateUserDto as any;

    // Tách dữ liệu: name vào user_information, các trường khác vào users
    const updatePromises: Promise<any>[] = [];

    // Cập nhật thông tin trong bảng users (email, role_id, status...)
    if (Object.keys(safeUpdateData).length > 0) {
      updatePromises.push(
        this.prisma.users.update({
          where: { id: id },
          data: safeUpdateData,
        })
      );
    }

    // Cập nhật name vào bảng user_information
    if (name !== undefined && user.user_information?.id) {
      updatePromises.push(
        this.prisma.user_information.update({
          where: {
            id: user.user_information.id,
          },
          data: {
            name: name,
          },
        })
      );
    }

    // Thực hiện tất cả update cùng lúc
    await Promise.all(updatePromises);

    // Lấy lại user đã update
    const updatedUser = await this.findById(id);

    const { password: _, ...result } = updatedUser as any;
    return result;
  }

  async remove(id: number, deletedBy: number) {
    const user = await this.findById(id);

    await this.prisma.users.update({
      where: { id: id },
      data: { deleted_at: new Date() },
    });

    return { message: SUCCESS_MESSAGES.DELETED_SUCCESSFULLY };
  }

  async updatePassword(user_id: number, hashedPassword: string, changedBy?: number) {
    const user = await this.prisma.users.update({
      where: { id: user_id },
      data: {
        password: hashedPassword,
      },
    });

  }
}
