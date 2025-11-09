import { Injectable, NotFoundException } from '@nestjs/common';
import { USER_ERRORS, SUCCESS_MESSAGES } from '../common/constants/error-messages.constants';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersPaginationDto } from './dto/pagination-queries.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma, ScopeType } from '@prisma/client';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private roleAssignmentService: RoleAssignmentService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;

    const user = await this.prisma.users.create({
      data: {
        ...userData,
        password: password,
        email_verified_at: new Date(),
        user_information: {
          create: {
            personal_email: userData.email,
            nationality: '',
            name: userData.name,
            code: '',
            avatar: '',
            gender: '',
            marital: '',
            birthday: '',
            address: '',
            temp_address: '',
            phone: '',
            tax_code: '',
            description: '',
            note: '',
            overview: '',
            expertise: '',
            technique: '',
            main_task: '',
          }
        },
      },
    });

    // Tạo role assignment cho user mới (company scope)
    if (userData.role) {
      await this.roleAssignmentService.assignRole({
        user_id: user.id,
        role_id: Number(userData.role),
        scope_type: ScopeType.COMPANY,
        assigned_by: 1,
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
    // Note: role_id filtering is now handled by role assignments
    // TODO: Implement role filtering via role assignments if needed

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
          created_at: true,
          updated_at: true,
          user_information: {
            select: {
              name: true,
              avatar: true,
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
          user_division: {
            select: {
              division: {
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
              },
            },
          },
        },
      }),
      this.prisma.users.count({ where }),
    ]);

    const transformedData = data.map((user) => ({
      ...user,
      avatar: user.user_information?.avatar,
      phone: user.user_information?.phone,
      address: user.user_information?.address,
      name: user.user_information?.name,
      // role: handled by role assignments
      position: user.user_information?.position,
      user_information: undefined,
    }));

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
        user_division: {
          where: {
            deleted_at: null,
          },
          include: {
            division: true,
          },
          take: 1, // Only take the first element
        },
      },
    });

    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    // Lấy role assignments của user
    const roleAssignments = await this.roleAssignmentService.getUserRoles(id);

    // Convert user_division from array to object
    return {
      ...user,
      user_division: user.user_division[0] || null,
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
        }
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
