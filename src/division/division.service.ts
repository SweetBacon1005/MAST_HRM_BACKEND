import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoleHierarchyService } from '../auth/services/role-hierarchy.service';
import { DateFormatUtil } from '../common/utils/date-format.util';
import {
  buildPaginationQuery,
  buildPaginationResponse,
  buildPaginationResponseFromDto,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { CreateDivisionDto } from './dto/create-division.dto';
import { DivisionPaginationDto } from './dto/pagination-queries.dto';
import {
  CreateRotationMemberDto,
  RotationMemberPaginationDto,
  UpdateRotationMemberDto,
} from './dto/rotation-member.dto';
import {
  CreateTeamDto,
  TeamPaginationDto,
  UpdateTeamDto,
} from './dto/team.dto';
import { UpdateDivisionDto } from './dto/update-division.dto';

@Injectable()
export class DivisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleHierarchyService: RoleHierarchyService,
  ) {}

  // === DIVISION CRUD ===

  async create(createDivisionDto: CreateDivisionDto) {
    const { founding_at, is_active_project, ...rest } = createDivisionDto;

    // Kiểm tra parent_id nếu có
    if (createDivisionDto.parent_id) {
      const parentDivision = await this.prisma.divisions.findUnique({
        where: { id: createDivisionDto.parent_id, deleted_at: null },
      });
      if (!parentDivision) {
        throw new NotFoundException('Phòng ban cha không tồn tại');
      }
    }

    // Kiểm tra tên phòng ban trùng lặp
    const existingDivision = await this.prisma.divisions.findFirst({
      where: {
        name: createDivisionDto.name,
        deleted_at: null,
      },
    });
    if (existingDivision) {
      throw new BadRequestException('Tên phòng ban đã tồn tại');
    }

    return await this.prisma.divisions.create({
      data: {
        ...rest,
        founding_at: new Date(founding_at),
        is_active_project: is_active_project ? 1 : 0,
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true },
          where: { deleted_at: null },
        },
        _count: {
          select: {
            user_division: true,
            projects: true,
          },
        },
      },
    });
  }

  async findAll(paginationDto: DivisionPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.divisionsWhereInput = { deleted_at: null };

    // Thêm filters
    if (paginationDto.search) {
      where.name = {
        contains: paginationDto.search,
      };
    }

    if (paginationDto.parent_id !== undefined) {
      where.parent_id = paginationDto.parent_id;
    }

    if (paginationDto.type !== undefined) {
      where.type = paginationDto.type;
    }

    if (paginationDto.status !== undefined) {
      where.status = paginationDto.status;
    }

    if (paginationDto.level !== undefined) {
      where.level = paginationDto.level;
    }

    if (paginationDto.is_active_project !== undefined) {
      where.is_active_project = paginationDto.is_active_project ? 1 : 0;
    }

    const [data, total] = await Promise.all([
      this.prisma.divisions.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          parent: {
            select: { id: true, name: true },
          },
          children: {
            select: { id: true, name: true },
            where: { deleted_at: null },
          },
          _count: {
            select: {
              user_division: true,
              projects: true,
            },
          },
        },
      }),
      this.prisma.divisions.count({ where }),
    ]);

    // Transform data để có format nhất quán
    const transformedData = data.map((division) => ({
      ...division,
      is_active_project: division.is_active_project === 1,
      founding_at: division.founding_at.toISOString().split('T')[0],
      member_count: division._count.user_division,
      project_count: division._count.projects,
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
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true },
          where: { deleted_at: null },
        },
        user_division: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                user_information: { select: { name: true } },
              },
            },
            role: {
              select: { id: true, name: true },
            },
          },
        },
        projects: {
          select: { id: true, name: true, code: true, status: true },
          where: { deleted_at: null },
        },
        _count: {
          select: {
            user_division: true,
            projects: true,
          },
        },
      },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }

    return {
      ...division,
      is_active_project: division.is_active_project === 1,
      founding_at: division.founding_at.toISOString().split('T')[0],
      member_count: division._count.user_division,
      project_count: division._count.projects,
    };
  }

  async update(id: number, updateDivisionDto: UpdateDivisionDto) {
    const division = await this.prisma.divisions.findUnique({
      where: { id, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }

    // Kiểm tra parent_id nếu có
    if (updateDivisionDto.parent_id) {
      if (updateDivisionDto.parent_id === id) {
        throw new BadRequestException(
          'Phòng ban không thể là cha của chính nó',
        );
      }

      const parentDivision = await this.prisma.divisions.findUnique({
        where: { id: updateDivisionDto.parent_id, deleted_at: null },
      });
      if (!parentDivision) {
        throw new NotFoundException('Phòng ban cha không tồn tại');
      }
    }

    // Kiểm tra tên phòng ban trùng lặp (nếu thay đổi tên)
    if (updateDivisionDto.name && updateDivisionDto.name !== division.name) {
      const existingDivision = await this.prisma.divisions.findFirst({
        where: {
          name: updateDivisionDto.name,
          deleted_at: null,
          id: { not: id },
        },
      });
      if (existingDivision) {
        throw new BadRequestException('Tên phòng ban đã tồn tại');
      }
    }

    const { founding_at, is_active_project, ...rest } = updateDivisionDto;
    const updateData: any = { ...rest };

    if (founding_at) {
      updateData.founding_at = new Date(founding_at);
    }

    if (is_active_project !== undefined) {
      updateData.is_active_project = is_active_project ? 1 : 0;
    }

    return await this.prisma.divisions.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true },
          where: { deleted_at: null },
        },
        _count: {
          select: {
            user_division: true,
            projects: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const division = await this.prisma.divisions.findUnique({
      where: { id, deleted_at: null },
      include: {
        children: {
          where: { deleted_at: null },
        },
        user_division: true,
        projects: {
          where: { deleted_at: null },
        },
      },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }

    // Kiểm tra có phòng ban con không
    if (division.children.length > 0) {
      throw new BadRequestException('Không thể xóa phòng ban có phòng ban con');
    }

    // Kiểm tra có nhân viên không
    if (division.user_division.length > 0) {
      throw new BadRequestException('Không thể xóa phòng ban có nhân viên');
    }

    // Kiểm tra có dự án không
    if (division.projects.length > 0) {
      throw new BadRequestException('Không thể xóa phòng ban có dự án');
    }

    return await this.prisma.divisions.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  // === UTILITY METHODS ===

  async getDivisionHierarchy(id?: number) {
    const where: Prisma.divisionsWhereInput = {
      deleted_at: null,
      parent_id: id || null,
    };

    const divisions = await this.prisma.divisions.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        children: {
          where: { deleted_at: null },
          orderBy: { name: 'asc' },
          include: {
            children: {
              where: { deleted_at: null },
              orderBy: { name: 'asc' },
            },
          },
        },
        _count: {
          select: {
            user_division: true,
            projects: true,
          },
        },
      },
    });

    return divisions.map((division) => ({
      ...division,
      is_active_project: division.is_active_project === 1,
      founding_at: division.founding_at.toISOString().split('T')[0],
      member_count: division._count.user_division,
      project_count: division._count.projects,
    }));
  }

  async getDivisionMembers(divisionId: number, queryDto: any) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    // Build where conditions for user_information filters
    const userInfoWhere: any = {
      deleted_at: null,
    };

    if (queryDto.positionId) {
      userInfoWhere.position_id = queryDto.positionId;
    }

    if (queryDto.levelId) {
      userInfoWhere.level_id = queryDto.levelId;
    }

    // Build where conditions
    const whereConditions: any = {
      divisionId: divisionId,
      user: {
        deleted_at: null,
        user_information: {
          some: userInfoWhere,
        },
      },
    };

    // Filter by team
    if (queryDto.teamId) {
      whereConditions.teamId = queryDto.teamId;
    }

    // Filter by search (name)
    if (queryDto.search) {
      whereConditions.user = {
        ...whereConditions.user,
        name: {
          contains: queryDto.search,
        },
      };
    }

    // Filter by skill
    if (queryDto.skillId) {
      whereConditions.user = {
        ...whereConditions.user,
        user_skills: {
          some: {
            skill_id: queryDto.skillId,
            deleted_at: null,
          },
        },
      };
    }

    // Build orderBy
    let orderBy: any = { created_at: 'desc' };
    if (queryDto.sortBy) {
      const sortOrder = queryDto.sortOrder || 'asc';
      switch (queryDto.sortBy) {
        case 'name':
          orderBy = { user: { name: sortOrder } };
          break;
        case 'join_date':
          orderBy = { created_at: sortOrder };
          break;
        default:
          orderBy = { created_at: 'desc' };
      }
    }

    const [userDivisions, total] = await Promise.all([
      this.prisma.user_division.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            include: {
              user_information: {
                where: { deleted_at: null },
                include: {
                  position: {
                    select: { id: true, name: true },
                  },
                  level: {
                    select: { id: true, name: true, coefficient: true },
                  },
                },
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
          team: {
            select: { id: true, name: true },
          },
          division: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.user_division.count({
        where: whereConditions,
      }),
    ]);

    // Transform data to match UI format
    const transformedData = userDivisions.map((ud) => {
      const userInfo = ud.user.user_information;

      // Calculate months of service (thâm niên)
      const now = new Date();
      const join = new Date(ud.user.created_at);
      const monthsOfService =
        (now.getFullYear() - join.getFullYear()) * 12 +
        (now.getMonth() - join.getMonth());

      // Get skills
      const skills = ud.user.user_skills.map((us) => us.skill.name);

      return {
        user_id: ud.user.id,
        code: userInfo?.code || '',
        name: ud.user.user_information?.[0]?.name || '',
        email: ud.user.email,
        avatar: userInfo?.avatar || '',
        birthday: userInfo?.birthday || null,
        team: ud.team?.name || ud.division?.name || '',
        team_id: ud.teamId || ud.divisionId,
        join_date: ud.user.created_at.toISOString().split('T')[0],
        months_of_service: monthsOfService,
        position: userInfo?.position?.name || '',
        position_id: userInfo?.position?.id || null,
        skills: skills.join(', '),
        level: userInfo?.level?.name || '',
        level_id: userInfo?.level?.id || null,
        coefficient: userInfo?.level?.coefficient || 0,
      };
    });

    return buildPaginationResponse(transformedData, total, page, limit);
  }

  // === ROTATION MEMBERS (PERSONNEL TRANSFER) ===

  async createRotationMember(
    createRotationDto: CreateRotationMemberDto,
    requesterId: number,
  ) {
    const { date_rotation, ...rest } = createRotationDto;

    // Kiểm tra user tồn tại
    const user = await this.prisma.users.findUnique({
      where: { id: createRotationDto.user_id, deleted_at: null },
      include: {
        user_information: {
          include: {
            role: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Kiểm tra phòng ban đích tồn tại
    const toDivision = await this.prisma.divisions.findUnique({
      where: { id: createRotationDto.division_id, deleted_at: null },
    });
    if (!toDivision) {
      throw new NotFoundException('Phòng ban đích không tồn tại');
    }

    // Kiểm tra user có assignment hiện tại không
    const currentAssignment = await this.prisma.user_division.findFirst({
      where: {
        userId: createRotationDto.user_id,
      },
      include: {
        division: {
          select: { id: true, name: true },
        },
      },
    });

    if (!currentAssignment) {
      throw new BadRequestException(
        'Người dùng chưa được phân công vào phòng ban nào',
      );
    }

    // Kiểm tra có điều chuyển trùng lặp không
    const existingRotation = await this.prisma.rotation_members.findFirst({
      where: {
        user_id: createRotationDto.user_id,
        division_id: createRotationDto.division_id,
        deleted_at: null,
      },
    });

    if (existingRotation) {
      throw new BadRequestException(
        'Người dùng đã có lịch sử điều chuyển đến phòng ban này',
      );
    }

    // Kiểm tra quyền phê duyệt theo cấp bậc
    const canApprove =
      await this.roleHierarchyService.canApprovePersonnelTransfer(
        requesterId,
        createRotationDto.user_id,
      );

    if (!canApprove) {
      throw new ForbiddenException(
        'Bạn không có quyền điều chuyển nhân viên này',
      );
    }

    // Bắt đầu transaction để đảm bảo tính nhất quán
    return await this.prisma.$transaction(async (prisma) => {
      // Tạo bản ghi rotation_members
      const rotation = await prisma.rotation_members.create({
        data: {
          ...rest,
          date_rotation: new Date(date_rotation),
          created_at: new Date(),
          updated_at: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: { select: { name: true } },
            },
          },
          division: {
            select: { id: true, name: true },
          },
        },
      });

      // Nếu là điều chuyển vĩnh viễn (type = 1), cập nhật user_division
      if (createRotationDto.type === 1) {
        // Xóa assignment cũ
        await prisma.user_division.deleteMany({
          where: {
            userId: createRotationDto.user_id,
          },
        });

        // Tạo assignment mới
        await prisma.user_division.create({
          data: {
            userId: createRotationDto.user_id,
            divisionId: createRotationDto.division_id,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      return {
        ...rotation,
        date_rotation: rotation.date_rotation.toISOString().split('T')[0],
        from_division: currentAssignment.division,
      };
    });
  }

  async findAllRotationMembers(paginationDto: RotationMemberPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: any = { deleted_at: null };

    // Thêm filters
    if (paginationDto.division_id) {
      where.division_id = paginationDto.division_id;
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
            select: { id: true, email: true, user_information: { select: { name: true } } },
          },
          division: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.rotation_members.count({ where }),
    ]);

    // Transform dates
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
          select: { id: true, email: true, user_information: { select: { name: true } } },
        },
        division: {
          select: { id: true, name: true },
        },
      },
    });

    if (!rotation) {
      throw new NotFoundException('Không tìm thấy bản ghi điều chuyển');
    }

    return {
      ...rotation,
      date_rotation: rotation.date_rotation.toISOString().split('T')[0],
    };
  }

  async updateRotationMember(
    id: number,
    updateRotationDto: UpdateRotationMemberDto,
  ) {
    const rotation = await this.prisma.rotation_members.findUnique({
      where: { id, deleted_at: null },
    });

    if (!rotation) {
      throw new NotFoundException('Không tìm thấy bản ghi điều chuyển');
    }

    const { date_rotation, ...rest } = updateRotationDto;
    const updateData: any = { ...rest };

    if (date_rotation) {
      updateData.date_rotation = new Date(date_rotation);
    }

    updateData.updated_at = new Date();

    return await this.prisma.rotation_members.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, user_information: { select: { name: true } } },
        },
        division: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteRotationMember(id: number) {
    const rotation = await this.prisma.rotation_members.findUnique({
      where: { id, deleted_at: null },
    });

    if (!rotation) {
      throw new NotFoundException('Không tìm thấy bản ghi điều chuyển');
    }

    return await this.prisma.rotation_members.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  // === DASHBOARD ===

  async getDashboard(divisionId: number, month?: number, year?: number) {
    // Kiểm tra division có tồn tại không
    const division = await this.prisma.divisions.findUnique({
      where: { id: divisionId, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }

    // Xác định tháng và năm hiện tại nếu không được cung cấp
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();
    const targetDate = new Date(targetYear, targetMonth - 1, 1);

    // Lấy các dữ liệu song song
    const [
      workingInfo,
      leaveRequests,
      lateInfo,
      recentBirthdayEmployees,
      attendanceStats,
    ] = await Promise.all([
      this.getWorkingInfo(divisionId, targetDate),
      this.getLeaveRequestsInfo(divisionId, targetDate),
      this.getLateInfo(divisionId, targetDate),
      this.getRecentBirthdayEmployees(divisionId, targetMonth),
      this.getAttendanceStatsByMonth(divisionId, targetYear),
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

  // === SEPARATE DASHBOARD APIS ===

  /**
   * API riêng cho thông tin sinh nhật nhân viên
   */
  async getBirthdayEmployees(divisionId: number, month?: number) {
    // Kiểm tra division có tồn tại không
    const division = await this.prisma.divisions.findUnique({
      where: { id: divisionId, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }

    // Xác định tháng hiện tại nếu không được cung cấp
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;

    const recentBirthdayEmployees = await this.getRecentBirthdayEmployees(divisionId, targetMonth);

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
async getWorkInfo(divisionId: number, workDate?: string) {
  // 1️⃣ Kiểm tra phòng ban
  const division = await this.prisma.divisions.findUnique({
    where: { id: divisionId, deleted_at: null },
  });
  if (!division) throw new NotFoundException('Không tìm thấy phòng ban');

  // 2️⃣ Xác định ngày làm việc
  const targetDate = workDate ? new Date(workDate) : new Date();
  const dateStr = DateFormatUtil.formatDate(targetDate) || targetDate.toISOString().split('T')[0];

  // 3️⃣ Lấy danh sách userId trong phòng ban
  const divisionUsers = await this.prisma.user_division.findMany({
    where: { divisionId },
    select: { userId: true },
  });
  const userIds = divisionUsers.map(u => u.userId);
  const totalMembers = userIds.length;

  if (!totalMembers) {
    return {
      division: { id: division.id, name: division.name },
      work_date: dateStr,
      working_info: { total_members: 0, working_count: 0, work_date: dateStr, employees: [] },
      leave_requests: { paid_leave_count: 0, unpaid_leave_count: 0, employees: [] },
      late_info: { late_count: 0, early_count: 0, employees: [] },
    };
  }

  // 4️⃣ Định nghĩa include chung cho user
  const userSelect = {
    select: {
      id: true,
      user_information: {
        select: { name: true, email: true, avatar: true, position: true },
      },
    },
  };

  // 5️⃣ Lấy dữ liệu song song để tối ưu hiệu suất
  const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

  const [
    leaveEmployees,
    [paidCount, unpaidCount],
    lateEmployees,
    [lateCount, earlyCount],
    workingEmployees,
    workingCount,
  ] = await Promise.all([
    // Nhân viên nghỉ phép
    this.prisma.day_offs.findMany({
      where: {
        user_id: { in: userIds },
        work_date: targetDate,
        status: 'APPROVED',
        deleted_at: null,
      },
      include: { user: userSelect },
    }),

    // Đếm nghỉ có phép / không phép
    Promise.all([
      this.prisma.day_offs.count({
        where: {
          user_id: { in: userIds },
          work_date: { gte: startOfMonth, lte: endOfMonth },
          status: 'APPROVED',
          type: 'PAID',
          deleted_at: null,
        },
      }),
      this.prisma.day_offs.count({
        where: {
          user_id: { in: userIds },
          work_date: { gte: startOfMonth, lte: endOfMonth },
          status: 'APPROVED',
          type: { in: ['UNPAID', 'SICK', 'MATERNITY', 'PERSONAL'] },
          deleted_at: null,
        },
      }),
    ]),

    // Nhân viên đi muộn
    this.prisma.time_sheets.findMany({
      where: {
        user_id: { in: userIds },
        work_date: targetDate,
        late_time: { not: null },
        deleted_at: null,
      },
      include: { user: userSelect },
    }),

    // Đếm đi muộn / về sớm
    Promise.all([
      this.prisma.time_sheets.count({
        where: {
          user_id: { in: userIds },
          work_date: { gte: startOfMonth, lte: endOfMonth },
          late_time: { gt: 0 },
          deleted_at: null,
        },
      }),
      this.prisma.time_sheets.count({
        where: {
          user_id: { in: userIds },
          work_date: { gte: startOfMonth, lte: endOfMonth },
          early_time: { gt: 0 },
          deleted_at: null,
        },
      }),
    ]),

    // Nhân viên đi làm
    this.prisma.time_sheets.findMany({
      where: {
        user_id: { in: userIds },
        work_date: targetDate,
        checkin: { not: null },
        deleted_at: null,
      },
      include: { user: userSelect },
    }),

    // Đếm số người đi làm
    this.prisma.time_sheets.count({
      where: {
        user_id: { in: userIds },
        work_date: targetDate,
        checkin: { not: null },
        deleted_at: null,
      },
    }),
  ]);

  // 6️⃣ Định dạng dữ liệu trả về
  const leaveRequests = {
    paid_leave_count: paidCount,
    unpaid_leave_count: unpaidCount,
    employees: leaveEmployees.map(l => ({
      user_id: l.user.id,
      name: l?.user?.user_information?.name,
      email: l?.user?.user_information?.email,
      avatar: l?.user?.user_information?.avatar,
      position: l?.user?.user_information?.position,
      work_date: DateFormatUtil.formatDate(l.work_date),
      status: 'Có phép',
    })),
  };

  const lateInfo = {
    late_count: lateCount,
    early_count: earlyCount,
    employees: lateEmployees.map(ts => ({
      user_id: ts.user.id,
      name: ts?.user?.user_information?.name,
      email: ts?.user?.user_information?.email,
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
    employees: workingEmployees.map(ts => {
      const duration = ts.checkout && ts.checkin
        ? (() => {
            const minutes = DateFormatUtil.getDifferenceInMinutes(ts.checkin, ts.checkout);
            return `${Math.floor(minutes / 60)}h${minutes % 60}m`;
          })()
        : 'Chưa checkout';
      return {
        user_id: ts.user.id,
        name: ts?.user?.user_information?.name,
        email: ts?.user?.user_information?.email,
        avatar: ts?.user?.user_information?.avatar,
        position: ts?.user?.user_information?.position,
        checkin_time: DateFormatUtil.formatTime(ts.checkin),
        checkout_time: DateFormatUtil.formatTime(ts.checkout),
        status: ts.late_time && ts.late_time > 0 ? 'Không phép' : 'Có phép',
        duration,
      };
    }),
  };

  // 7️⃣ Trả kết quả
  return {
    division: { id: division.id, name: division.name },
    work_date: dateStr,
    working_info: workingInfo,
    leave_requests: leaveRequests,
    late_info: lateInfo,
  };
}


  /**
   * API riêng cho thống kê theo năm
   */
  async getStatistics(divisionId: number, year?: number) {
    // Kiểm tra division có tồn tại không
    const division = await this.prisma.divisions.findUnique({
      where: { id: divisionId, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }

    // Xác định năm hiện tại nếu không được cung cấp
    const targetYear = year || new Date().getFullYear();

    const attendanceStats = await this.getAttendanceStatsByMonth(divisionId, targetYear);

    return {
      division: {
        id: division.id,
        name: division.name,
      },
      year: targetYear,
      attendance_stats: attendanceStats,
    };
  }

  // === EMPLOYEE DETAIL APIS ===

  /**
   * API lấy chi tiết nhân viên nghỉ phép trong ngày
   */
  async getLeaveEmployeeDetails(divisionId: number, date?: string) {
    // Kiểm tra division có tồn tại không
    const division = await this.prisma.divisions.findUnique({
      where: { id: divisionId, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }

    // Xác định ngày
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = DateFormatUtil.formatDate(targetDate) || targetDate.toISOString().split('T')[0];

    // Lấy danh sách user_id trong division
    const divisionUsers = await this.prisma.user_division.findMany({
      where: { divisionId: divisionId },
      select: { userId: true },
    });

    const userIds = divisionUsers.map((u) => u.userId);

    if (userIds.length === 0) {
      return {
        division: { id: division.id, name: division.name },
        date: dateStr,
        employees: [],
      };
    }

    // Lấy danh sách nhân viên nghỉ phép trong ngày
    const leaveEmployees = await this.prisma.day_offs.findMany({
      where: {
        user_id: { in: userIds },
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

  /**
   * API lấy chi tiết nhân viên đi muộn trong ngày
   */
  async getLateEmployeeDetails(divisionId: number, date?: string) {
    // Kiểm tra division có tồn tại không
    const division = await this.prisma.divisions.findUnique({
      where: { id: divisionId, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }

    // Xác định ngày
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = DateFormatUtil.formatDate(targetDate) || targetDate.toISOString().split('T')[0];

    // Lấy danh sách user_id trong division
    const divisionUsers = await this.prisma.user_division.findMany({
      where: { divisionId: divisionId },
      select: { userId: true },
    });

    const userIds = divisionUsers.map((u) => u.userId);

    if (userIds.length === 0) {
      return {
        division: { id: division.id, name: division.name },
        date: dateStr,
        employees: [],
      };
    }

    // Lấy danh sách nhân viên đi muộn trong ngày
    const lateEmployees = await this.prisma.time_sheets.findMany({
      where: {
        user_id: { in: userIds },
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

  /**
   * API lấy chi tiết nhân viên đi làm trong ngày
   */
  async getWorkingEmployeeDetails(divisionId: number, date?: string) {
    // Kiểm tra division có tồn tại không
    const division = await this.prisma.divisions.findUnique({
      where: { id: divisionId, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }

    // Xác định ngày
    const targetDate = date ? new Date(date) : new Date();
    const dateStr = DateFormatUtil.formatDate(targetDate) || targetDate.toISOString().split('T')[0];

    // Lấy danh sách user_id trong division
    const divisionUsers = await this.prisma.user_division.findMany({
      where: { divisionId: divisionId },
      select: { userId: true },
    });

    const userIds = divisionUsers.map((u) => u.userId);

    if (userIds.length === 0) {
      return {
        division: { id: division.id, name: division.name },
        date: dateStr,
        employees: [],
      };
    }

    // Lấy danh sách nhân viên đi làm trong ngày
    const workingEmployees = await this.prisma.time_sheets.findMany({
      where: {
        user_id: { in: userIds },
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
      status: timesheet.late_time && timesheet.late_time > 0 ? 'Không phép' : 'Có phép',
      duration: timesheet.checkout && timesheet.checkin ? 
        (() => {
          const minutes = DateFormatUtil.getDifferenceInMinutes(timesheet.checkin, timesheet.checkout);
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;
          return `${hours}h${remainingMinutes}m`;
        })() : 
        'Chưa checkout',
    }));

    return {
      division: { id: division.id, name: division.name },
      date: dateStr,
      employees,
    };
  }

  /**
   * Lấy thông tin làm việc của division
   * Tính: Số lượng đi làm / Tổng số nhân viên trong division
   */
  private async getWorkingInfo(divisionId: number, date: Date) {
    const dateStr = DateFormatUtil.formatDate(date) || date.toISOString().split('T')[0];

    // Lấy danh sách user_id trong division
    const divisionUsers = await this.prisma.user_division.findMany({
      where: {
        divisionId: divisionId,
      },
      select: {
        userId: true,
      },
    });

    const userIds = divisionUsers.map((u) => u.userId);
    const totalMembers = userIds.length;

    if (userIds.length === 0) {
      return {
        total_members: 0,
        working_count: 0,
        work_date: dateStr,
      };
    }

    // Đếm số người đã check-in trong ngày
    const workingCount = await this.prisma.time_sheets.count({
      where: {
        user_id: { in: userIds },
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

  /**
   * Lấy thông tin nghỉ phép trong tháng
   */
  private async getLeaveRequestsInfo(divisionId: number, date: Date) {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // Lấy danh sách user_id trong division
    const divisionUsers = await this.prisma.user_division.findMany({
      where: {
        divisionId: divisionId,
      },
      select: {
        userId: true,
      },
    });

    const userIds = divisionUsers.map((u) => u.userId);

    if (userIds.length === 0) {
      return {
        paid_leave_count: 0,
        unpaid_leave_count: 0,
      };
    }

    // Đếm số đơn nghỉ phép có lương (PAID) và không lương (UNPAID) đã approved
    const [paidCount, unpaidCount] = await Promise.all([
      this.prisma.day_offs.count({
        where: {
          user_id: { in: userIds },
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
          user_id: { in: userIds },
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

  /**
   * Lấy thông tin đi muộn trong tháng
   */
  private async getLateInfo(divisionId: number, date: Date) {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // Lấy danh sách user_id trong division
    const divisionUsers = await this.prisma.user_division.findMany({
      where: {
        divisionId: divisionId,
      },
      select: {
        userId: true,
      },
    });

    const userIds = divisionUsers.map((u) => u.userId);

    if (userIds.length === 0) {
      return {
        late_count: 0,
        early_count: 0,
      };
    }

    // Đếm số lượt đi muộn và về sớm (có late_time > 0 hoặc early_time > 0)
    const [lateCount, earlyCount] = await Promise.all([
      this.prisma.time_sheets.count({
        where: {
          user_id: { in: userIds },
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
          user_id: { in: userIds },
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

  /**
   * Lấy danh sách nhân viên sinh nhật gần nhất trong tháng
   */
  private async getRecentBirthdayEmployees(divisionId: number, month: number) {
    const now = new Date();

    // Lấy danh sách user_id trong division hiện tại
    const divisionUsers = await this.prisma.user_division.findMany({
      where: {
        divisionId: divisionId,
      },
      select: {
        userId: true,
      },
    });

    const userIds = divisionUsers.map((u) => u.userId);

    if (userIds.length === 0) {
      return [];
    }

    // Lấy danh sách nhân viên có sinh nhật trong tháng
    const employees = await this.prisma.user_information.findMany({
      where: {
        user_id: { in: userIds },
        deleted_at: null,
      },
      select: {
        user_id: true,
        name: true,
        avatar: true,
        birthday: true,
      },
      orderBy: {
        birthday: 'desc',
      },
    });

    // Lọc và format theo tháng sinh nhật
    const birthdayEmployees = employees
      .filter((emp) => {
        const birthdayMonth = new Date(emp.birthday).getMonth() + 1;
        return birthdayMonth === month;
      })
      .map((emp) => {
        const birthday = new Date(emp.birthday);
        const currentYear = now.getFullYear();
        const nextBirthday = new Date(
          currentYear,
          birthday.getMonth(),
          birthday.getDate(),
        );

        // Tính số ngày tới sinh nhật
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        const diffTime = nextBirthday.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          user_id: emp.user_id,
          name: emp.name,
          avatar: emp.avatar,
          birthday: DateFormatUtil.formatDate(emp.birthday) || emp.birthday.toISOString().split('T')[0],
          birthday_date: birthday.getDate(),
          birthday_month: birthday.getMonth() + 1,
          days_until_birthday: diffDays,
        };
      })
      .sort((a, b) => a.days_until_birthday - b.days_until_birthday)
      .slice(0, 10); // Lấy 10 người gần nhất

    return birthdayEmployees;
  }

  /**
   * Lấy thống kê attendance theo từng tháng trong năm
   * Trả về: số giờ đi muộn, số giờ muộn thực tế (approved), số giờ OT
   */
  private async getAttendanceStatsByMonth(divisionId: number, year: number) {
    const stats: Array<{
      month: number;
      late_hours: number;
      actual_late_hours: number;
      overtime_hours: number;
    }> = [];

    // Lấy danh sách user_id trong division
    const divisionUsers = await this.prisma.user_division.findMany({
      where: {
        divisionId: divisionId,
      },
      select: {
        userId: true,
      },
    });

    const userIds = divisionUsers.map((u) => u.userId);

    if (userIds.length === 0) {
      // Trả về 12 tháng với giá trị 0
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

    // Lấy dữ liệu cho từng tháng
    for (let month = 1; month <= 12; month++) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);

      const [lateMinutes, actualLateMinutes, overtimeHours] = await Promise.all(
        [
          // Tổng số phút đi muộn
          this.prisma.time_sheets.aggregate({
            where: {
              user_id: { in: userIds },
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
          // Tổng số phút đi muộn được approve
          this.prisma.time_sheets.aggregate({
            where: {
              user_id: { in: userIds },
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
          // Tổng số giờ OT
          this.prisma.over_times_history.aggregate({
            where: {
              user_id: { in: userIds },
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
        ],
      );

      stats.push({
        month,
        late_hours: Math.round((lateMinutes._sum.late_time || 0) / 60),
        actual_late_hours: Math.round(
          (actualLateMinutes._sum.late_time_approved || 0) / 60,
        ),
        overtime_hours: Math.round(overtimeHours._sum.total_hours || 0),
      });
    }

    return stats;
  }

  // === TEAM MANAGEMENT ===

  async createTeam(createTeamDto: CreateTeamDto) {
    // Kiểm tra division có tồn tại không
    const division = await this.prisma.divisions.findUnique({
      where: { id: createTeamDto.divisionId, deleted_at: null },
    });

    if (!division) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }

    // Kiểm tra manager có tồn tại không (nếu có)
    if (createTeamDto.managerId) {
      const manager = await this.prisma.users.findUnique({
        where: { id: createTeamDto.managerId, deleted_at: null },
      });

      if (!manager) {
        throw new NotFoundException('Không tìm thấy người quản lý');
      }
    }

    // Kiểm tra tên team đã tồn tại chưa
    const existingTeam = await this.prisma.teams.findFirst({
      where: {
        name: createTeamDto.name,
        division_id: createTeamDto.divisionId,
        deleted_at: null,
      },
    });

    if (existingTeam) {
      throw new BadRequestException('Tên team đã tồn tại trong phòng ban này');
    }

    const team = await this.prisma.teams.create({
      data: {
        name: createTeamDto.name,
        division_id: createTeamDto.divisionId,
        manager_id: createTeamDto.managerId,
        founding_date: createTeamDto.foundingDate
          ? new Date(createTeamDto.foundingDate)
          : new Date(),
      },
    });

    return team;
  }

  async findAllTeams(paginationDto: TeamPaginationDto) {
    const {
      skip,
      take,
      orderBy: defaultOrderBy,
    } = buildPaginationQuery(paginationDto);

    // Build where conditions
    const whereConditions: any = {
      deleted_at: null,
    };

    if (paginationDto.search) {
      whereConditions.name = {
        contains: paginationDto.search,
      };
    }

    if (paginationDto.divisionId) {
      whereConditions.division_id = paginationDto.divisionId;
    }

    // Build orderBy - ưu tiên sortBy custom, nếu không có thì dùng defaultOrderBy
    let orderBy: any = defaultOrderBy || { created_at: 'desc' };
    if (paginationDto.sortBy) {
      orderBy = { [paginationDto.sortBy]: paginationDto.sort_order || 'desc' };
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

    // Fetch additional data for each team
    const teamsWithDetails = await Promise.all(
      teams.map(async (team) => {
        // Get manager info
        let manager: {
          id: number;
          name: string | null;
          email: string;
          avatar: string;
        } | null = null;

        if (team.manager_id) {
          const managerData = await this.prisma.users.findUnique({
            where: { id: team.manager_id },
            select: {
              id: true,
              user_information: { select: { name: true, avatar: true } },
              email: true,
            },
          });

          if (managerData) {
            manager = {
              id: managerData.id,
              name: managerData.user_information?.name || '',
              email: managerData.email,
              avatar: managerData?.user_information?.avatar || '',
            };
          }
        }

        // Count members
        const memberCount = await this.prisma.user_division.count({
          where: {
            teamId: team.id,
          },
        });

        // Get resource by level
        const members = await this.prisma.user_division.findMany({
          where: {
            teamId: team.id,
          },
          include: {
            user: {
              include: {
                user_information: {
                  include: {
                    level: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        });

        // Count by level
        const levelCounts: Record<string, number> = {};
        members.forEach((member) => {
          const levelName =
            member?.user?.user_information?.level?.name || 'Unknown';
          levelCounts[levelName] = (levelCounts[levelName] || 0) + 1;
        });

        // Get active projects
        const activeProjects = await this.prisma.projects.findMany({
          where: {
            team_id: team.id,
            deleted_at: null,
            // Assuming status 1 means active
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
          resource_by_level: levelCounts,
          active_projects: activeProjects.map((p) => p.name).join(', '),
          founding_date: team.founding_date,
          created_at: team.created_at,
        };
      }),
    );

    return buildPaginationResponseFromDto(
      teamsWithDetails,
      total,
      paginationDto,
    );
  }

  async findOneTeam(id: number) {
    const team = await this.prisma.teams.findUnique({
      where: { id, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException('Không tìm thấy team');
    }

    // Get manager info
    let manager: {
      id: number;
      name: string | null;
      email: string;
      avatar: string;
      position: string;
    } | null = null;

    if (team.manager_id) {
      const managerData = await this.prisma.users.findUnique({
        where: { id: team.manager_id },
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
      });

      if (managerData) {
        manager = {
          id: managerData.id,
          name: managerData?.user_information?.name || '',
          email: managerData.email,
          avatar: managerData?.user_information?.avatar || '',
          position: managerData?.user_information?.position?.name || '',
        };
      }
    }

    // Count members
    const memberCount = await this.prisma.user_division.count({
      where: {
        teamId: team.id,
      },
    });

    // Get resource by level
    const members = await this.prisma.user_division.findMany({
      where: {
        teamId: team.id,
      },
      include: {
        user: {
          include: {
            user_information: {
              include: {
                level: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    // Count by level
    const levelCounts: Record<string, number> = {};
    members.forEach((member) => {
      const levelName =
        member?.user?.user_information?.level?.name || 'Unknown';
      levelCounts[levelName] = (levelCounts[levelName] || 0) + 1;
    });

    // Get active projects
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
      resource_by_level: levelCounts,
      active_projects: activeProjects,
      founding_date: team.founding_date,
      created_at: team.created_at,
      updated_at: team.updated_at,
    };
  }

  async updateTeam(id: number, updateTeamDto: UpdateTeamDto) {
    const team = await this.prisma.teams.findUnique({
      where: { id, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException('Không tìm thấy team');
    }

    // Kiểm tra manager có tồn tại không (nếu có)
    if (updateTeamDto.managerId) {
      const manager = await this.prisma.users.findUnique({
        where: { id: updateTeamDto.managerId, deleted_at: null },
      });

      if (!manager) {
        throw new NotFoundException('Không tìm thấy người quản lý');
      }
    }

    // Kiểm tra tên team trùng lặp
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
        throw new BadRequestException(
          'Tên team đã tồn tại trong phòng ban này',
        );
      }
    }

    const updatedTeam = await this.prisma.teams.update({
      where: { id },
      data: {
        name: updateTeamDto.name,
        manager_id: updateTeamDto.managerId,
        founding_date: updateTeamDto.foundingDate
          ? new Date(updateTeamDto.foundingDate)
          : undefined,
      },
    });

    return updatedTeam;
  }

  async removeTeam(id: number) {
    const team = await this.prisma.teams.findUnique({
      where: { id, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException('Không tìm thấy team');
    }

    // Kiểm tra xem team có thành viên không
    const memberCount = await this.prisma.user_division.count({
      where: { teamId: id },
    });

    if (memberCount > 0) {
      throw new BadRequestException(
        `Không thể xóa team vì còn ${memberCount} thành viên. Vui lòng chuyển thành viên sang team khác trước.`,
      );
    }

    // Kiểm tra xem team có dự án không
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

    // Soft delete
    await this.prisma.teams.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return { message: 'Xóa team thành công' };
  }
}
