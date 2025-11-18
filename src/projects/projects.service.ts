import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ScopeType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectPaginationDto } from './dto/project-pagination.dto';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper method to count project members from user_role_assignment
   */
  private async getProjectMemberCount(projectId: number): Promise<number> {
    return await this.prisma.user_role_assignment.count({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: projectId,
        deleted_at: null
      }
    });
  }

  private async getProjectMembersData(projectId: number) {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: projectId,
        deleted_at: null
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: { select: { name: true } }
          }
        },
        role: {
          select: { name: true }
        }
      }
    });

    return assignments.map(assignment => ({
      id: assignment.user.id,
      name: assignment.user.user_information?.name || '',
      email: assignment.user.email,
      role: assignment.role?.name || ''
    }));
  }

  async create(createProjectDto: CreateProjectDto) {
    const { start_date, end_date, ...rest } = createProjectDto;

    // Kiểm tra mã dự án trùng lặp
    const existingProject = await this.prisma.projects.findFirst({
      where: {
        code: createProjectDto.code,
        deleted_at: null,
      },
    });

    if (existingProject) {
      throw new BadRequestException('Mã dự án đã tồn tại');
    }

    // Kiểm tra division nếu có
    if (createProjectDto.division_id) {
      const division = await this.prisma.divisions.findUnique({
        where: { id: createProjectDto.division_id, deleted_at: null },
      });
      if (!division) {
        throw new NotFoundException('Phòng ban không tồn tại');
      }
    }

    // Kiểm tra team nếu có
    if (createProjectDto.team_id) {
      const team = await this.prisma.teams.findUnique({
        where: { id: createProjectDto.team_id, deleted_at: null },
      });
      if (!team) {
        throw new NotFoundException('Team không tồn tại');
      }
    }

    // Kiểm tra ngày hợp lệ
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (startDate >= endDate) {
      throw new BadRequestException('Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
    }

    const createData: any = {
      ...rest,
      start_date: startDate,
      end_date: endDate,
      status: (createProjectDto.status || 'OPEN') as any,
    };

    return await this.prisma.projects.create({
      data: createData,
      include: {
        division: {
          select: { id: true, name: true },
        },
        team: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findAll(paginationDto: ProjectPaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.projectsWhereInput = { deleted_at: null };

    // Filters
    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { code: { contains: paginationDto.search } },
      ];
    }

    if (paginationDto.status) {
      where.status = paginationDto.status as any;
    }

    if (paginationDto.division_id) {
      where.division_id = paginationDto.division_id;
    }

    if (paginationDto.team_id) {
      where.team_id = paginationDto.team_id;
    }

    if (paginationDto.project_type) {
      where.project_type = paginationDto.project_type as any;
    }

    const [data, total] = await Promise.all([
      this.prisma.projects.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          division: {
            select: { id: true, name: true },
          },
          team: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.projects.count({ where }),
    ]);

    const projectIds = data.map((p) => p.id);
    const memberCounts =
      projectIds.length > 0
        ? await this.prisma.user_role_assignment.groupBy({
            by: ['scope_id'],
            where: {
              scope_type: ScopeType.PROJECT,
              scope_id: { in: projectIds },
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

    const transformedData = data.map((project) => ({
      ...project,
      start_date: project.start_date.toISOString().split('T')[0],
      end_date: project.end_date.toISOString().split('T')[0],
      member_count: memberCountMap.get(project.id) || 0,
    }));

    return buildPaginationResponse(
      transformedData,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOne(id: number) {
    const project = await this.prisma.projects.findUnique({
      where: { id, deleted_at: null },
      include: {
        division: {
          select: { id: true, name: true },
        },
        team: {
          select: { id: true, name: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy dự án');
    }

    return {
      ...project,
      start_date: project.start_date.toISOString().split('T')[0],
      end_date: project.end_date.toISOString().split('T')[0],
      member_count: await this.getProjectMemberCount(project.id),
      members: await this.getProjectMembersData(project.id)
    };
  }

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    const project = await this.prisma.projects.findUnique({
      where: { id, deleted_at: null },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy dự án');
    }

    // Kiểm tra mã dự án trùng lặp (nếu thay đổi)
    if (updateProjectDto.code && updateProjectDto.code !== project.code) {
      const existingProject = await this.prisma.projects.findFirst({
        where: {
          code: updateProjectDto.code,
          deleted_at: null,
          id: { not: id },
        },
      });
      if (existingProject) {
        throw new BadRequestException('Mã dự án đã tồn tại');
      }
    }

    // Kiểm tra division nếu có thay đổi
    if (updateProjectDto.division_id !== undefined) {
      if (updateProjectDto.division_id !== null) {
        const division = await this.prisma.divisions.findUnique({
          where: { id: updateProjectDto.division_id, deleted_at: null },
        });
        if (!division) {
          throw new NotFoundException('Phòng ban không tồn tại');
        }
      }
    }

    // Kiểm tra team nếu có thay đổi
    if (updateProjectDto.team_id !== undefined) {
      if (updateProjectDto.team_id !== null) {
        const team = await this.prisma.teams.findUnique({
          where: { id: updateProjectDto.team_id, deleted_at: null },
        });
        if (!team) {
          throw new NotFoundException('Team không tồn tại');
        }
      }
    }

    const { start_date, end_date, ...rest } = updateProjectDto;
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

    return await this.prisma.projects.update({
      where: { id },
      data: updateData,
      include: {
        division: {
          select: { id: true, name: true },
        },
        team: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async remove(id: number) {
    const project = await this.prisma.projects.findUnique({
      where: { id, deleted_at: null },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy dự án');
    }

    const projectMembers = await this.prisma.user_role_assignment.updateMany({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: id,
        deleted_at: null
      },
      data: {
        deleted_at: new Date()
      }
    });

    return await this.prisma.projects.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async getProjectMembers(projectId: number) {
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId, deleted_at: null },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy dự án');
    }

    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: projectId,
        deleted_at: null
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: {
                name: true,
                position: { select: { id: true, name: true } },
                level: { select: { id: true, name: true, coefficient: true } },
              },
            },
          },
        },
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return assignments.map(assignment => ({
      id: assignment.user.id,
      email: assignment.user.email,
      name: assignment.user.user_information?.name || '',
      role: {
        id: assignment.role?.id || null,
        name: assignment.role?.name || '',
      },
      position: assignment.user.user_information?.position
        ? {
            id: assignment.user.user_information.position.id,
            name: assignment.user.user_information.position.name,
          }
        : null,
      level: assignment.user.user_information?.level
        ? {
            id: assignment.user.user_information.level.id,
            name: assignment.user.user_information.level.name,
            coefficient: assignment.user.user_information.level.coefficient,
          }
        : null,
    }));
  }
  async findMyProjects(paginationDto: ProjectPaginationDto, userId: number) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: userId,
        scope_type: ScopeType.PROJECT,
        deleted_at: null,
      },
      select: { scope_id: true },
    });

    const ids = assignments
      .map((p) => p.scope_id)
      .filter((id): id is number => typeof id === 'number');

    if (!ids.length) {
      return buildPaginationResponse(
        [],
        0,
        paginationDto.page || 1,
        paginationDto.limit || 10,
      );
    }

    const where: Prisma.projectsWhereInput = {
      id: { in: ids },
      deleted_at: null,
    };

    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { code: { contains: paginationDto.search } },
      ];
    }

    if (paginationDto.status) {
      where.status = paginationDto.status as any;
    }

    const [data, total] = await Promise.all([
      this.prisma.projects.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          division: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
        },
      }),
      this.prisma.projects.count({ where }),
    ]);

    // Lấy member count cho tất cả projects trong 1 query
    const dataProjectIds = data.map((p) => p.id);
    const memberCounts =
      dataProjectIds.length > 0
        ? await this.prisma.user_role_assignment.groupBy({
            by: ['scope_id'],
            where: {
              scope_type: ScopeType.PROJECT,
              scope_id: { in: dataProjectIds },
              deleted_at: null,
            },
            _count: {
              user_id: true,
            },
          })
        : [];
    const memberCountMap = new Map(
      memberCounts
        .filter((mc) => mc.scope_id !== null)
        .map((mc) => [mc.scope_id!, mc._count.user_id]),
    );

    const transformedData = data.map((project) => ({
      ...project,
      start_date: project.start_date.toISOString().split('T')[0],
      end_date: project.end_date.toISOString().split('T')[0],
      member_count: memberCountMap.get(project.id) || 0,
    }));

    return buildPaginationResponse(
      transformedData,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async updateProgress(id: number, progress: number) {
    const project = await this.prisma.projects.findFirst({
      where: { id, deleted_at: null },
    });

    if (!project) {
      throw new NotFoundException('Kh�ng t�m th?y d? �n');
    }

    // Prisma model has Float? progress; store 0-1 or 0-100? Seeds/readme mention Float?
    // We accept 0..100 from API and normalize to 0..100 in DB as-is.
    return await this.prisma.projects.update({
      where: { id },
      data: { progress },
      include: {
        division: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });
  }
}
