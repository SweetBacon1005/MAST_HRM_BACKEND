import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectAccessType,
  ProjectStatus,
  ProjectType,
  ScopeType,
} from '@prisma/client';
import { ROLE_IDS, ROLE_NAMES } from '../auth/constants/role.constants';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import {
  PROJECT_ERRORS,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { MilestonesService } from '../milestones/milestones.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectPaginationDto } from './dto/project-pagination.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleAssignmentService: RoleAssignmentService,
    private readonly milestonesService: MilestonesService,
  ) {}
  private async getProjectMemberCount(projectId: number): Promise<number> {
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId },
      select: { team_id: true },
    });

    // Count PM (Project Manager assignments)
    const pmCount = await this.prisma.user_role_assignment.count({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: projectId,
        role_id: ROLE_IDS.PROJECT_MANAGER,
        deleted_at: null,
      },
    });

    // Count team members
    const teamMemberCount = project?.team_id
      ? await this.prisma.user_role_assignment.count({
          where: {
            scope_type: ScopeType.TEAM,
            scope_id: project.team_id,
            deleted_at: null,
          },
        })
      : 0;

    return pmCount + teamMemberCount;
  }

  private async getUserManagedDivisions(user_id: number): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: user_id,
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
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId },
      select: { team_id: true },
    });

    // Get PM (Project Manager)
    const pmAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: projectId,
        role_id: ROLE_IDS.PROJECT_MANAGER,
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

    // Get team members
    const teamAssignments = project?.team_id
      ? await this.prisma.user_role_assignment.findMany({
          where: {
            scope_type: ScopeType.TEAM,
            scope_id: project.team_id,
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
        })
      : [];

    // Combine PM and team members
    const allAssignments = [...pmAssignments, ...teamAssignments];

    return allAssignments.map((assignment) => ({
      id: assignment.user.id,
      name: assignment.user.user_information?.name || '',
      email: assignment.user.email,
      role: assignment.role?.name || '',
    }));
  }

  async create(createProjectDto: CreateProjectDto) {
    const { start_date, end_date, manager_id, ...rest } = createProjectDto;

    const existingProject = await this.prisma.projects.findFirst({
      where: {
        code: createProjectDto.code,
        deleted_at: null,
      },
    });

    if (existingProject) {
      throw new BadRequestException(PROJECT_ERRORS.PROJECT_CODE_EXISTS);
    }

    const manager = await this.prisma.users.findUnique({
      where: { id: manager_id, deleted_at: null },
    });

    if (!manager) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
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
      project_type: createProjectDto.project_type,
      project_access_type:
        createProjectDto.project_access_type || ProjectAccessType.RESTRICTED,
      industry: createProjectDto.industry,
      description: rest.description,
      division: createProjectDto.division_id
        ? { connect: { id: createProjectDto.division_id } }
        : undefined,
      team: createProjectDto.team_id
        ? { connect: { id: createProjectDto.team_id } }
        : undefined,
    };

    const project = await this.prisma.projects.create({
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

    await this.prisma.user_role_assignment.create({
      data: {
        user_id: manager_id,
        role_id: ROLE_IDS.PROJECT_MANAGER,
        scope_type: ScopeType.PROJECT,
        scope_id: project.id,
        assigned_by: manager_id, // Manager assigns themselves initially
        created_at: new Date(),
      },
    });

    return project;
  }

  async findAll(
    paginationDto: ProjectPaginationDto,
    user_id?: number,
    userRole?: string,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.projectsWhereInput = { deleted_at: null };

    if (user_id && userRole) {
      const { roles } = await this.roleAssignmentService.getUserRoles(user_id);

      if (userRole !== ROLE_NAMES.ADMIN) {
        const divisionIds = roles
          .filter(
            (r) =>
              r.name === ROLE_NAMES.DIVISION_HEAD &&
              r.scope_type === 'DIVISION',
          )
          .map((r) => r.scope_id as number);

        const teamIds = roles
          .filter(
            (r) => r.name === ROLE_NAMES.TEAM_LEADER && r.scope_type === 'TEAM',
          )
          .map((r) => r.scope_id as number);

        const projectManagerIds = roles
          .filter(
            (r) =>
              r.name === ROLE_NAMES.PROJECT_MANAGER &&
              r.scope_type === 'PROJECT',
          )
          .map((r) => r.scope_id as number);

        const teamMemberAssignments =
          await this.prisma.user_role_assignment.findMany({
            where: {
              user_id,
              scope_type: ScopeType.TEAM,
              deleted_at: null,
            },
            select: { scope_id: true },
          });

        const memberTeamIds = teamMemberAssignments
          .map((a) => a.scope_id)
          .filter((id): id is number => id !== null);

        const allTeamIds = [...new Set([...teamIds, ...memberTeamIds])];

        const restrictedWhere: any[] = [];

        if (divisionIds.length > 0) {
          restrictedWhere.push({ division_id: { in: divisionIds } });
        }

        if (allTeamIds.length > 0) {
          restrictedWhere.push({ team_id: { in: allTeamIds } });
        }

        if (projectManagerIds.length > 0) {
          restrictedWhere.push({ id: { in: projectManagerIds } });
        }

        if (restrictedWhere.length > 0) {
          where.OR = [
            { project_access_type: 'COMPANY' },
            {
              AND: [
                { project_access_type: 'RESTRICTED' },
                { OR: restrictedWhere },
              ],
            },
          ];
        } else {
          where.project_access_type = 'COMPANY';
        }
      }
    }

    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { code: { contains: paginationDto.search } },
      ];
    }

    if (paginationDto.status) {
      where.status = paginationDto.status as any;
    }

    if (paginationDto.project_type) {
      where.project_type = paginationDto.project_type;
    }

    if (paginationDto.division_id) {
      where.division_id = paginationDto.division_id;
    }

    if (paginationDto.team_id) {
      where.team_id = paginationDto.team_id;
    }

    if (paginationDto.project_access_type) {
      where.project_access_type = paginationDto.project_access_type;
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

    // Get team IDs for projects
    const teamIds = [
      ...new Set(
        data.map((p) => p.team_id).filter((id): id is number => id !== null),
      ),
    ];

    const memberCounts =
      teamIds.length > 0
        ? await this.prisma.user_role_assignment.groupBy({
            by: ['scope_id'],
            where: {
              scope_type: ScopeType.TEAM,
              scope_id: { in: teamIds },
              deleted_at: null,
            },
            _count: {
              user_id: true,
            },
          })
        : [];
    const teamMemberCountMap = new Map(
      memberCounts.map((mc) => [mc.scope_id, mc._count.user_id]),
    );

    const transformedData = data.map((project) => ({
      ...project,
      start_date: project.start_date.toISOString().split('T')[0],
      end_date: project.end_date.toISOString().split('T')[0],
      member_count: project.team_id
        ? teamMemberCountMap.get(project.team_id) || 0
        : 0,
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

    const progress = await this.milestonesService.calculateProjectProgress(id);

    return {
      ...project,
      start_date: project.start_date.toISOString().split('T')[0],
      end_date: project.end_date.toISOString().split('T')[0],
      member_count: await this.getProjectMemberCount(project.id),
      members: await this.getProjectMembersData(project.id),
      progress,
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

    if (updateProjectDto.manager_id !== undefined) {
      const newManager = await this.prisma.users.findUnique({
        where: { id: updateProjectDto.manager_id, deleted_at: null },
      });

      if (!newManager) {
        throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
      }

      await this.prisma.user_role_assignment.updateMany({
        where: {
          scope_type: ScopeType.PROJECT,
          scope_id: id,
          role_id: ROLE_IDS.PROJECT_MANAGER,
          deleted_at: null,
        },
        data: {
          deleted_at: new Date(),
        },
      });

      await this.prisma.user_role_assignment.create({
        data: {
          user_id: updateProjectDto.manager_id,
          role_id: ROLE_IDS.PROJECT_MANAGER,
          scope_type: ScopeType.PROJECT,
          scope_id: id,
          assigned_by: updateProjectDto.manager_id,
          created_at: new Date(),
        },
      });
    }

    const {
      start_date,
      end_date,
      status,
      project_type,
      project_access_type,
      industry,
      manager_id: _manager_id,
      ...rest
    } = updateProjectDto;
    const updateData: Prisma.projectsUpdateInput = { ...rest };

    if (status) {
      updateData.status = status as ProjectStatus;
    }

    if (project_type !== undefined) {
      updateData.project_type = project_type as ProjectType;
    }

    if (project_access_type !== undefined) {
      updateData.project_access_type = project_access_type as ProjectAccessType;
    }

    if (industry !== undefined) {
      updateData.industry = industry;
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
      include: {
        team: { select: { id: true } },
      },
    });

    if (!project) {
      throw new NotFoundException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    // Get PM (Project Manager)
    const pmAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.PROJECT,
        scope_id: projectId,
        role_id: ROLE_IDS.PROJECT_MANAGER,
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

    // Get team members
    const teamAssignments = project.team_id
      ? await this.prisma.user_role_assignment.findMany({
          where: {
            scope_type: ScopeType.TEAM,
            scope_id: project.team_id,
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
                    level: {
                      select: { id: true, name: true, coefficient: true },
                    },
                  },
                },
              },
            },
            role: {
              select: { id: true, name: true },
            },
          },
        })
      : [];

    // Combine PM and team members
    const allAssignments = [...pmAssignments, ...teamAssignments];

    return allAssignments.map((assignment) => ({
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
  async findMyProjects(paginationDto: ProjectPaginationDto, user_id: number) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: user_id,
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

    if (paginationDto.project_type) {
      where.project_type = paginationDto.project_type;
    }

    if (paginationDto.project_access_type) {
      where.project_access_type = paginationDto.project_access_type;
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

    const teamIds = [
      ...new Set(
        data.map((p) => p.team_id).filter((id): id is number => id !== null),
      ),
    ];
    const memberCounts =
      teamIds.length > 0
        ? await this.prisma.user_role_assignment.groupBy({
            by: ['scope_id'],
            where: {
              scope_type: ScopeType.TEAM,
              scope_id: { in: teamIds },
              deleted_at: null,
            },
            _count: {
              user_id: true,
            },
          })
        : [];
    const teamMemberCountMap = new Map(
      memberCounts
        .filter((mc) => mc.scope_id !== null)
        .map((mc) => [mc.scope_id!, mc._count.user_id]),
    );

    const transformedData = data.map((project) => ({
      ...project,
      start_date: project.start_date.toISOString().split('T')[0],
      end_date: project.end_date.toISOString().split('T')[0],
      member_count: project.team_id
        ? teamMemberCountMap.get(project.team_id) || 0
        : 0,
    }));

    return buildPaginationResponse(
      transformedData,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findManagedProjects(
    paginationDto: ProjectPaginationDto,
    user_id: number,
  ) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: user_id,
        scope_type: ScopeType.PROJECT,
        role_id: ROLE_IDS.PROJECT_MANAGER,
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

    if (paginationDto.division_id) {
      where.division_id = paginationDto.division_id;
    }

    if (paginationDto.team_id) {
      where.team_id = paginationDto.team_id;
    }

    if (paginationDto.project_access_type) {
      where.project_access_type = paginationDto.project_access_type;
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

    const teamIds = [
      ...new Set(
        data.map((p) => p.team_id).filter((id): id is number => id !== null),
      ),
    ];
    const memberCounts =
      teamIds.length > 0
        ? await this.prisma.user_role_assignment.groupBy({
            by: ['scope_id'],
            where: {
              scope_type: ScopeType.TEAM,
              scope_id: { in: teamIds },
              deleted_at: null,
            },
            _count: {
              user_id: true,
            },
          })
        : [];
    const teamMemberCountMap = new Map(
      memberCounts
        .filter((mc) => mc.scope_id !== null)
        .map((mc) => [mc.scope_id!, mc._count.user_id]),
    );

    const transformedData = data.map((project) => ({
      ...project,
      start_date: project.start_date.toISOString().split('T')[0],
      end_date: project.end_date.toISOString().split('T')[0],
      member_count: project.team_id
        ? teamMemberCountMap.get(project.team_id) || 0
        : 0,
    }));

    return buildPaginationResponse(
      transformedData,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async updateProgress(id: number, progress: number) {
    throw new BadRequestException(
      'Tiến độ dự án được tính tự động từ các mốc. Vui lòng cập nhật tiến độ của từng mốc.',
    );
  }

  async addProjectMember(
    project_id: number,
    user_id: number,
    role_id: number,
    assigned_by: number,
  ) {
    const project = await this.prisma.projects.findUnique({
      where: { id: project_id, deleted_at: null },
    });

    if (!project) {
      throw new NotFoundException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    const user = await this.prisma.users.findUnique({
      where: { id: user_id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    const role = await this.prisma.roles.findUnique({
      where: { id: role_id, deleted_at: null },
    });

    if (!role) {
      throw new NotFoundException('Role không tồn tại');
    }

    const existingAssignment = await this.prisma.user_role_assignment.findFirst(
      {
        where: {
          user_id,
          scope_type: ScopeType.PROJECT,
          scope_id: project_id,
          deleted_at: null,
        },
      },
    );

    if (existingAssignment) {
      throw new BadRequestException('User đã là thành viên của dự án này');
    }

    const assignment = await this.prisma.user_role_assignment.create({
      data: {
        user_id,
        role_id,
        scope_type: ScopeType.PROJECT,
        scope_id: project_id,
        assigned_by,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
        role: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      message: 'Thêm thành viên vào dự án thành công',
      data: {
        id: assignment.user.id,
        email: assignment.user.email,
        name: assignment.user.user_information?.name || '',
        role: {
          id: assignment.role.id,
          name: assignment.role.name,
        },
      },
    };
  }

  async removeProjectMember(project_id: number, user_id: number) {
    const project = await this.prisma.projects.findUnique({
      where: { id: project_id, deleted_at: null },
      include: {
        team: { select: { id: true } },
      },
    });

    if (!project) {
      throw new NotFoundException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    // Check if user is PM (Project Manager)
    const pmAssignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id,
        scope_type: ScopeType.PROJECT,
        scope_id: project_id,
        role_id: ROLE_IDS.PROJECT_MANAGER,
        deleted_at: null,
      },
    });

    if (pmAssignment) {
      throw new BadRequestException(
        'Không thể xóa Project Manager khỏi dự án. Vui lòng chuyển quyền quản lý trước.',
      );
    }

    // Check if user is team member
    if (!project.team_id) {
      throw new BadRequestException('Dự án không thuộc team nào');
    }

    const teamAssignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id,
        scope_type: ScopeType.TEAM,
        scope_id: project.team_id,
        deleted_at: null,
      },
    });

    if (!teamAssignment) {
      throw new NotFoundException(
        'User không phải là thành viên của dự án này',
      );
    }

    // Xóa user khỏi team (tự động mất quyền truy cập dự án)
    await this.prisma.user_role_assignment.update({
      where: { id: teamAssignment.id },
      data: { deleted_at: new Date() },
    });

    return {
      message: 'Đã xóa thành viên khỏi team và dự án',
    };
  }
}
