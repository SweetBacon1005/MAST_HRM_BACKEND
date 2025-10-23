import { Injectable, NotFoundException } from '@nestjs/common';
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
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;

    const user = await this.prisma.users.create({
      data: {
        ...userData,
        password: password,
        email_verified_at: new Date(),
      },
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
            role: {
              select: {
                id: true,
                name: true,
              },
            },
            position: {
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
    const where: any = { deleted_at: null };

    // Thêm filter theo search (tên hoặc email)
    if (paginationDto.search) {
      where.OR = [
        {
          name: {
            contains: paginationDto.search,
          },
        },
        {
          email: {
            contains: paginationDto.search,
          },
        },
      ];
    }

    // Thêm filter theo user_information
    const userInfoFilters: any = {};
    if (paginationDto.position_id) {
      userInfoFilters.position_id = paginationDto.position_id;
    }
    if (paginationDto.office_id) {
      userInfoFilters.office_id = paginationDto.office_id;
    }
    if (paginationDto.role_id) {
      userInfoFilters.role_id = paginationDto.role_id;
    }

    if (Object.keys(userInfoFilters).length > 0) {
      where.user_information = {
        some: userInfoFilters,
      };
    }

    // Lấy dữ liệu và đếm tổng
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
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
      this.prisma.users.count({ where }),
    ]);

    // Transform data giống như findAll
    const transformedData = data.map((user) => ({
      ...user,
      role: user.user_information?.[0]?.role,
      position: user.user_information?.[0]?.position,
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
            role: true,
            position: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.users.findFirst({
      where: {
        email,
        deleted_at: null,
      },
      include: {
        user_information: {
          include: {
            role: true,
            position: true,
          },
        },
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
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

    return { message: 'Xóa người dùng thành công' };
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
