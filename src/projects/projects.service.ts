import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectStatus, ProjectType, ScopeType } from '@prisma/client';
import { ROLE_NAMES } from '../auth/constants/role.constants';
import { PROJECT_ERRORS } from '../common/constants/error-messages.constants';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectPaginationDto } from './dto/project-pagination.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}
  private async getProjectMemberCount(projectId: number): Promise<number> {
    return await this.prisma.user_role_assignment.count({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: projectId,
        deleted_at: null,
      },
    });
  }

  private async getUserManagedDivisions(userId: number): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: userId,
        scope_type: ScopeType.DIVISION,
        deleted_at: null,
        scope_id: { not: null },
        role: {
          name: ROLE_NAMES.DIVISION_HEAD,
          deleted_at: null,
        },
      },
      select: {
        scope_id: true,
      },
    });

    return [
      ...new Set(
        assignments
          .map((a) => a.scope_id)
          .filter((id): id is number => id !== null),
      ),
    ];
  }

  private async getProjectMembersData(projectId: number) {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: projectId,
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
        role: {
          select: { name: true },
        },
      },
    });

    return assignments.map((assignment) => ({
      id: assignment.user.id,
      name: assignment.user.user_information?.name || '',
      email: assignment.user.email,
      role: assignment.role?.name || '',
    }));
  }

  async create(createProjectDto: CreateProjectDto) {
    const { start_date, end_date, ...rest } = createProjectDto;

    const existingProject = await this.prisma.projects.findFirst({
      where: {
        code: createProjectDto.code,
        deleted_at: null,
      },
    });

    if (existingProject) {
      throw new BadRequestException(PROJECT_ERRORS.PROJECT_CODE_EXISTS);
    }

    if (createProjectDto.division_id) {
      const division = await this.prisma.divisions.findUnique({
        where: { id: createProjectDto.division_id, deleted_at: null },
      });
      if (!division) {
        throw new NotFoundException(PROJECT_ERRORS.DIVISION_NOT_FOUND);
      }
    }

    if (createProjectDto.team_id) {
      const team = await this.prisma.teams.findUnique({
        where: { id: createProjectDto.team_id, deleted_at: null },
      });
      if (!team) {
        throw new NotFoundException(PROJECT_ERRORS.TEAM_NOT_FOUND);
      }
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (startDate >= endDate) {
      throw new BadRequestException(PROJECT_ERRORS.START_DATE_AFTER_END_DATE);
    }

    const createData: Prisma.projectsCreateInput = {
      name: rest.name,
      code: rest.code,
      start_date: startDate,
      end_date: endDate,
      status: createProjectDto.status,
      project_type: rest.project_type as ProjectType | null | undefined,
      description: rest.description,
      progress: 0,
      division: createProjectDto.division_id
        ? { connect: { id: createProjectDto.division_id } }
        : undefined,
      team: createProjectDto.team_id
        ? { connect: { id: createProjectDto.team_id } }
        : undefined,
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

  async findAll(
    paginationDto: ProjectPaginationDto,
    userId?: number,
    userRole?: string,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.projectsWhereInput = { deleted_at: null };

    // Role-based filtering
    if (userId && userRole) {
      if (userRole === ROLE_NAMES.DIVISION_HEAD) {
        // Division Head chỉ xem projects trong divisions mình quản lý
        const managedDivisions = await this.getUserManagedDivisions(userId);
        if (managedDivisions.length > 0) {
          where.division_id = { in: managedDivisions };
        } else {
          // Không quản lý division nào, return empty
          return buildPaginationResponse(
            [],
            0,
            paginationDto.page || 1,
            paginationDto.limit || 10,
          );
        }
      }
      // Admin có thể lọc theo division_id hoặc xem tất cả
    }

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
      throw new NotFoundException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    return {
      ...project,
      start_date: project.start_date.toISOString().split('T')[0],
      end_date: project.end_date.toISOString().split('T')[0],
      member_count: await this.getProjectMemberCount(project.id),
      members: await this.getProjectMembersData(project.id),
    };
  }

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    const project = await this.prisma.projects.findUnique({
      where: { id, deleted_at: null },
    });

    if (!project) {
      throw new NotFoundException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    if (updateProjectDto.code && updateProjectDto.code !== project.code) {
      const existingProject = await this.prisma.projects.findFirst({
        where: {
          code: updateProjectDto.code,
          deleted_at: null,
          id: { not: id },
        },
      });
      if (existingProject) {
        throw new BadRequestException(PROJECT_ERRORS.PROJECT_CODE_EXISTS);
      }
    }

    if (updateProjectDto.division_id !== undefined) {
      if (updateProjectDto.division_id !== null) {
        const division = await this.prisma.divisions.findUnique({
          where: { id: updateProjectDto.division_id, deleted_at: null },
        });
        if (!division) {
          throw new NotFoundException(PROJECT_ERRORS.DIVISION_NOT_FOUND);
        }
      }
    }

    if (updateProjectDto.team_id !== undefined) {
      if (updateProjectDto.team_id !== null) {
        const team = await this.prisma.teams.findUnique({
          where: { id: updateProjectDto.team_id, deleted_at: null },
        });
        if (!team) {
          throw new NotFoundException(PROJECT_ERRORS.TEAM_NOT_FOUND);
        }
      }
    }

    const { start_date, end_date, status, project_type, ...rest } =
      updateProjectDto;
    const updateData: Prisma.projectsUpdateInput = { ...rest };

    if (status) {
      updateData.status = status as ProjectStatus;
    }

    if (project_type) {
      updateData.project_type = project_type as ProjectType;
    }

    if (start_date) {
      updateData.start_date = new Date(start_date);
    }

    if (end_date) {
      updateData.end_date = new Date(end_date);
    }

    if (start_date && end_date) {
      if (new Date(start_date) >= new Date(end_date)) {
        throw new BadRequestException(PROJECT_ERRORS.START_DATE_AFTER_END_DATE);
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
      throw new NotFoundException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    await this.prisma.user_role_assignment.updateMany({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: id,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
      },
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
      throw new NotFoundException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: projectId,
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

    return assignments.map((assignment) => ({
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
      throw new NotFoundException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    if (progress < 0 || progress > 100) {
      throw new BadRequestException(PROJECT_ERRORS.INVALID_PROGRESS_VALUE);
    }

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
