import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { RoleHierarchyService } from '../auth/services/role-hierarchy.service';
import { CreateDivisionDto } from './dto/create-division.dto';
import { UpdateDivisionDto } from './dto/update-division.dto';
import {
  DivisionPaginationDto,
  DivisionAssignmentPaginationDto,
} from './dto/pagination-queries.dto';
import {
  CreateDivisionAssignmentDto,
  UpdateDivisionAssignmentDto,
} from './dto/division-assignment.dto';
import {
  CreateRotationMemberDto,
  UpdateRotationMemberDto,
  RotationMemberPaginationDto,
} from './dto/rotation-member.dto';

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
              select: { id: true, name: true, email: true },
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

  // === DIVISION ASSIGNMENTS ===

  async createAssignment(createAssignmentDto: CreateDivisionAssignmentDto) {
    const { start_date, end_date, ...rest } = createAssignmentDto;

    // Kiểm tra division tồn tại
    const division = await this.prisma.divisions.findUnique({
      where: { id: createAssignmentDto.division_id, deleted_at: null },
    });
    if (!division) {
      throw new NotFoundException('Phòng ban không tồn tại');
    }

    // Kiểm tra user tồn tại
    const user = await this.prisma.users.findUnique({
      where: { id: createAssignmentDto.user_id, deleted_at: null },
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Kiểm tra contract nếu có
    if (createAssignmentDto.contract_id) {
      const contract = await this.prisma.contracts.findUnique({
        where: { id: createAssignmentDto.contract_id },
      });
      if (!contract) {
        throw new NotFoundException('Hợp đồng không tồn tại');
      }
    }

    // Kiểm tra ngày hợp lệ
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (startDate >= endDate) {
      throw new BadRequestException('Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
    }

    // Kiểm tra trùng lặp assignment
    const existingAssignment =
      await this.prisma.divisions_assignments.findFirst({
        where: {
          division_id: createAssignmentDto.division_id,
          user_id: createAssignmentDto.user_id,
          OR: [
            {
              start_date: { lte: endDate },
              end_date: { gte: startDate },
            },
          ],
        },
      });

    if (existingAssignment) {
      throw new BadRequestException(
        'Người dùng đã được phân công vào phòng ban trong khoảng thời gian này',
      );
    }

    return await this.prisma.divisions_assignments.create({
      data: {
        ...rest,
        start_date: startDate,
        end_date: endDate,
      },
      include: {
        division: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        contract: {
          select: { id: true },
        },
      },
    });
  }

  async findAllAssignments(paginationDto: DivisionAssignmentPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.divisions_assignmentsWhereInput = {};

    // Thêm filters
    if (paginationDto.division_id) {
      where.division_id = paginationDto.division_id;
    }

    if (paginationDto.user_id) {
      where.user_id = paginationDto.user_id;
    }

    if (paginationDto.start_date || paginationDto.end_date) {
      where.AND = [];
      if (paginationDto.start_date) {
        where.AND.push({
          start_date: { gte: new Date(paginationDto.start_date) },
        });
      }
      if (paginationDto.end_date) {
        where.AND.push({
          end_date: { lte: new Date(paginationDto.end_date) },
        });
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.divisions_assignments.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          division: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
          contract: {
            select: { id: true },
          },
        },
      }),
      this.prisma.divisions_assignments.count({ where }),
    ]);

    // Transform dates
    const transformedData = data.map((assignment) => ({
      ...assignment,
      start_date: assignment.start_date.toISOString().split('T')[0],
      end_date: assignment.end_date.toISOString().split('T')[0],
    }));

    return buildPaginationResponse(
      transformedData,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOneAssignment(id: number) {
    const assignment = await this.prisma.divisions_assignments.findUnique({
      where: { id },
      include: {
        division: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        contract: {
          select: { id: true },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Không tìm thấy phân công phòng ban');
    }

    return {
      ...assignment,
      start_date: assignment.start_date.toISOString().split('T')[0],
      end_date: assignment.end_date.toISOString().split('T')[0],
    };
  }

  async updateAssignment(
    id: number,
    updateAssignmentDto: UpdateDivisionAssignmentDto,
  ) {
    const assignment = await this.prisma.divisions_assignments.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Không tìm thấy phân công phòng ban');
    }

    const { start_date, end_date, ...rest } = updateAssignmentDto;
    const updateData: any = { ...rest };

    if (start_date) {
      updateData.start_date = new Date(start_date);
    }

    if (end_date) {
      updateData.end_date = new Date(end_date);
    }

    // Kiểm tra ngày hợp lệ nếu cả hai đều được cập nhật
    if (start_date && end_date) {
      if (new Date(start_date) >= new Date(end_date)) {
        throw new BadRequestException(
          'Ngày bắt đầu phải nhỏ hơn ngày kết thúc',
        );
      }
    }

    return await this.prisma.divisions_assignments.update({
      where: { id },
      data: updateData,
      include: {
        division: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
        contract: {
          select: { id: true },
        },
      },
    });
  }

  async removeAssignment(id: number) {
    const assignment = await this.prisma.divisions_assignments.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException('Không tìm thấy phân công phòng ban');
    }

    return await this.prisma.divisions_assignments.delete({
      where: { id },
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

  async getDivisionMembers(
    divisionId: number,
    paginationDto: DivisionPaginationDto,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const [data, total] = await Promise.all([
      this.prisma.user_division.findMany({
        where: {
          divisionId: divisionId,
        },
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              user_information: {
                select: {
                  position: { select: { name: true } },
                  level: { select: { name: true } },
                },
              },
            },
          },
          role: {
            select: { id: true, name: true },
          },
          team: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.user_division.count({
        where: { divisionId: divisionId },
      }),
    ]);

    return buildPaginationResponse(
      data,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
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
            select: { id: true, name: true, email: true },
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
            select: { id: true, name: true, email: true },
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
          select: { id: true, name: true, email: true },
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
          select: { id: true, name: true, email: true },
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

  /**
   * Lấy thông tin làm việc của division
   * Tính: Số lượng đi làm / Tổng số nhân viên trong division
   */
  private async getWorkingInfo(divisionId: number, date: Date) {
    const dateStr = date.toISOString().split('T')[0];

    // Lấy tổng số nhân viên trong division (active assignments)
    const totalMembers = await this.prisma.divisions_assignments.count({
      where: {
        division_id: divisionId,
        start_date: { lte: date },
        end_date: { gte: date },
      },
    });

    // Lấy danh sách user_id trong division
    const divisionUsers = await this.prisma.divisions_assignments.findMany({
      where: {
        division_id: divisionId,
        start_date: { lte: date },
        end_date: { gte: date },
      },
      select: {
        user_id: true,
      },
    });

    const userIds = divisionUsers.map((u) => u.user_id);

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
    const divisionUsers = await this.prisma.divisions_assignments.findMany({
      where: {
        division_id: divisionId,
        start_date: { lte: endOfMonth },
        end_date: { gte: startOfMonth },
      },
      select: {
        user_id: true,
      },
    });

    const userIds = divisionUsers.map((u) => u.user_id);

    if (userIds.length === 0) {
      return {
        approved_count: 0,
        rejected_count: 0,
      };
    }

    // Đếm số đơn nghỉ phép approved và rejected
    const [approvedCount, rejectedCount] = await Promise.all([
      this.prisma.day_offs.count({
        where: {
          user_id: { in: userIds },
          work_date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: 'APPROVED',
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
          status: 'REJECTED',
          deleted_at: null,
        },
      }),
    ]);

    return {
      approved_count: approvedCount,
      rejected_count: rejectedCount,
    };
  }

  /**
   * Lấy thông tin đi muộn trong tháng
   */
  private async getLateInfo(divisionId: number, date: Date) {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // Lấy danh sách user_id trong division
    const divisionUsers = await this.prisma.divisions_assignments.findMany({
      where: {
        division_id: divisionId,
        start_date: { lte: endOfMonth },
        end_date: { gte: startOfMonth },
      },
      select: {
        user_id: true,
      },
    });

    const userIds = divisionUsers.map((u) => u.user_id);

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
  private async getRecentBirthdayEmployees(
    divisionId: number,
    month: number,
  ) {
    const now = new Date();

    // Lấy danh sách user_id trong division hiện tại
    const divisionUsers = await this.prisma.divisions_assignments.findMany({
      where: {
        division_id: divisionId,
        start_date: { lte: now },
        end_date: { gte: now },
      },
      select: {
        user_id: true,
      },
    });

    const userIds = divisionUsers.map((u) => u.user_id);

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
        email: true,
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
          email: emp.email,
          avatar: emp.avatar,
          birthday: emp.birthday.toISOString().split('T')[0],
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

    // Lấy danh sách user_id trong division (lấy tất cả assignments trong năm)
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const divisionUsers = await this.prisma.divisions_assignments.findMany({
      where: {
        division_id: divisionId,
        start_date: { lte: endOfYear },
        end_date: { gte: startOfYear },
      },
      select: {
        user_id: true,
      },
    });

    const userIds = Array.from(
      new Set(divisionUsers.map((u) => u.user_id)),
    );

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
}
