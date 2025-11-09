import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
        scope_type: 'PROJECT',
        scope_id: projectId,
        deleted_at: null
      }
    });
  }

  private async getProjectMembersData(projectId: number) {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: 'PROJECT',
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
      name: assignment.user.user_information?.[0]?.name || '',
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

    // Transform dates
    const transformedData = await Promise.all(
      data.map(async (project) => ({
        ...project,
        start_date: project.start_date.toISOString().split('T')[0],
        end_date: project.end_date.toISOString().split('T')[0],
        member_count: await this.getProjectMemberCount(project.id),
      }))
    );

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
        scope_type: 'PROJECT',
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

    const members = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: 'PROJECT',
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
                position: { select: { name: true } },
                level: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return members;
  }
}

