import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import { ROLE_IDS } from '../auth/constants/role.constants';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { CreateTeamDto, UpdateTeamDto, TeamPaginationDto } from '../division/dto/team.dto';
import { AddTeamMemberDto } from './dto/add-member.dto';
import {
  TEAM_ERRORS,
  USER_ERRORS,
  SUCCESS_MESSAGES,
} from '../common/constants/error-messages.constants';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleAssignmentService: RoleAssignmentService,
  ) {}

  async create(createTeamDto: CreateTeamDto, assignedBy: number) {
    const { division_id, leader_id, founding_date, name } = createTeamDto;

    // Validate division
    const division = await this.prisma.divisions.findFirst({
      where: { id: division_id, deleted_at: null },
    });
    if (!division) {
      throw new NotFoundException('Không tìm thấy division');
    }

    // Validate leader
    const leader = await this.prisma.users.findFirst({
      where: { id: leader_id, deleted_at: null },
    });
    if (!leader) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    // Check duplicate team name in division
    const existingTeam = await this.prisma.teams.findFirst({
      where: {
        name,
        division_id,
        deleted_at: null,
      },
    });
    if (existingTeam) {
      throw new BadRequestException(TEAM_ERRORS.TEAM_NAME_EXISTS_IN_DIVISION);
    }

    // Create team
    const team = await this.prisma.teams.create({
      data: {
        name,
        division_id,
        founding_date: founding_date ? new Date(founding_date) : new Date(),
      },
      include: {
        division: {
          select: { id: true, name: true },
        },
      },
    });

    // Assign leader role
    await this.prisma.user_role_assignment.create({
      data: {
        user_id: leader_id,
        role_id: ROLE_IDS.TEAM_LEADER,
        scope_type: ScopeType.TEAM,
        scope_id: team.id,
        assigned_by: assignedBy,
      },
    });

    return {
      message: SUCCESS_MESSAGES.TEAM_CREATED,
      data: team,
    };
  }

  async findAll(paginationDto: TeamPaginationDto) {
    const { page = 1, limit = 10, search, division_id } = paginationDto;
    const { skip, take } = buildPaginationQuery({ page, limit });

    const where: any = {
      deleted_at: null,
    };

    if (search) {
      where.name = { contains: search };
    }

    if (division_id) {
      where.division_id = division_id;
    }

    const [data, total] = await Promise.all([
      this.prisma.teams.findMany({
        where,
        skip,
        take,
        include: {
          division: {
            select: { id: true, name: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.teams.count({ where }),
    ]);

    // Get member count for each team
    const teamIds = data.map((t) => t.id);
    const memberCounts = await this.prisma.user_role_assignment.groupBy({
      by: ['scope_id'],
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: { in: teamIds },
        deleted_at: null,
      },
      _count: { user_id: true },
    });

    const memberCountMap = new Map(
      memberCounts.map((mc) => [mc.scope_id, mc._count.user_id]),
    );

    // Get detailed team data with manager and resource info
    const transformedData = await Promise.all(
      data.map(async (team) => {
        // Get team leader
        const leaderAssignment = await this.prisma.user_role_assignment.findFirst({
          where: {
            scope_type: ScopeType.TEAM,
            scope_id: team.id,
            role_id: ROLE_IDS.TEAM_LEADER,
            deleted_at: null,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                user_information: {
                  select: { name: true, avatar: true },
                },
              },
            },
          },
        });

        const manager = leaderAssignment ? {
          id: leaderAssignment.user.id,
          name: leaderAssignment.user.user_information?.name || '',
          email: leaderAssignment.user.email,
          avatar: leaderAssignment.user.user_information?.avatar || null,
        } : null;

        // Get members for resource breakdown
        const members = await this.prisma.user_role_assignment.findMany({
          where: {
            scope_type: ScopeType.TEAM,
            scope_id: team.id,
            deleted_at: null,
          },
          include: {
            user: {
              select: {
                user_information: {
                  select: {
                    level: { select: { name: true } },
                  },
                },
              },
            },
          },
        });

        const resourceByLevel = members.reduce((acc, member) => {
          const levelName = member.user.user_information?.level?.name || 'Unknown';
          acc[levelName] = (acc[levelName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Get active projects
        const activeProjects = await this.prisma.projects.findMany({
          where: {
            team_id: team.id,
            deleted_at: null,
          },
          select: { id: true, name: true },
        });

        return {
          id: team.id,
          name: team.name,
          division_id: team.division_id,
          division: team.division,
          manager,
          member_count: memberCountMap.get(team.id) || 0,
          resource_by_level: resourceByLevel,
          active_projects: activeProjects, // Array of {id, name} - Better for frontend
          founding_date: team.founding_date
            ? team.founding_date.toISOString().split('T')[0]
            : null,
          created_at: team.created_at,
          updated_at: team.updated_at,
        };
      }),
    );

    return buildPaginationResponse(transformedData, total, page, limit);
  }

  async findOne(id: number) {
    const team = await this.prisma.teams.findFirst({
      where: { id, deleted_at: null },
      include: {
        division: {
          select: { id: true, name: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(TEAM_ERRORS.TEAM_NOT_FOUND);
    }

    // Get members
    const members = await this.getTeamMembers(id);

    // Get projects
    const projects = await this.prisma.projects.findMany({
      where: {
        team_id: id,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        start_date: true,
        end_date: true,
      },
    });

    return {
      message: 'Lấy thông tin team thành công',
      data: {
        ...team,
        founding_date: team.founding_date
          ? team.founding_date.toISOString().split('T')[0]
          : null,
        member_count: members.length,
        project_count: projects.length,
        members,
        projects: projects.map((p) => ({
          ...p,
          start_date: p.start_date.toISOString().split('T')[0],
          end_date: p.end_date.toISOString().split('T')[0],
        })),
      },
    };
  }

  async update(id: number, updateTeamDto: UpdateTeamDto) {
    const team = await this.prisma.teams.findFirst({
      where: { id, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException(TEAM_ERRORS.TEAM_NOT_FOUND);
    }

    // Check if name is being changed and if it already exists
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
        throw new BadRequestException(TEAM_ERRORS.TEAM_NAME_EXISTS);
      }
    }

    const updated = await this.prisma.teams.update({
      where: { id },
      data: {
        name: updateTeamDto.name,
        founding_date: updateTeamDto.founding_date 
          ? new Date(updateTeamDto.founding_date) 
          : undefined,
      },
      include: {
        division: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      message: SUCCESS_MESSAGES.TEAM_UPDATED,
      data: updated,
    };
  }

  async remove(id: number) {
    const team = await this.prisma.teams.findFirst({
      where: { id, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException(TEAM_ERRORS.TEAM_NOT_FOUND);
    }

    // Check if team has members
    const memberCount = await this.prisma.user_role_assignment.count({
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: id,
        deleted_at: null,
      },
    });

    if (memberCount > 0) {
      throw new BadRequestException(
        `Không thể xóa team vì còn ${memberCount} thành viên. Vui lòng chuyển thành viên sang team khác trước.`,
      );
    }

    // Check if team has projects
    const projectCount = await this.prisma.projects.count({
      where: { team_id: id, deleted_at: null },
    });

    if (projectCount > 0) {
      throw new BadRequestException(
        `Không thể xóa team vì còn ${projectCount} dự án. Vui lòng chuyển dự án sang team khác trước.`,
      );
    }

    // Soft delete team
    await this.prisma.teams.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return {
      message: SUCCESS_MESSAGES.TEAM_DELETED,
    };
  }

  async addMember(teamId: number, dto: AddTeamMemberDto, assignedBy: number) {
    // Validate team exists
    const team = await this.prisma.teams.findFirst({
      where: { id: teamId, deleted_at: null },
      include: {
        division: { select: { id: true, name: true } },
      },
    });

    if (!team) {
      throw new NotFoundException(TEAM_ERRORS.TEAM_NOT_FOUND);
    }

    // Validate user exists
    const user = await this.prisma.users.findFirst({
      where: { id: dto.user_id, deleted_at: null },
      include: {
        user_information: {
          select: { name: true, code: true, avatar: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    // Check if user already in team
    const existing = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: dto.user_id,
        scope_type: ScopeType.TEAM,
        scope_id: teamId,
        deleted_at: null,
      },
    });

    if (existing) {
      throw new BadRequestException('User đã là thành viên của team này');
    }

    // Use default Employee role if not specified
    const roleId = dto.role_id || ROLE_IDS.EMPLOYEE;

    // Validate role exists
    const role = await this.prisma.roles.findFirst({
      where: { id: roleId, deleted_at: null },
    });

    if (!role) {
      throw new NotFoundException('Không tìm thấy role');
    }

    // Create team membership
    const assignment = await this.prisma.user_role_assignment.create({
      data: {
        user_id: dto.user_id,
        role_id: roleId,
        scope_type: ScopeType.TEAM,
        scope_id: teamId,
        assigned_by: assignedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true, code: true, avatar: true },
            },
          },
        },
        role: {
          select: { id: true, name: true },
        },
      },
    });

    // Get project count
    const projectCount = await this.prisma.projects.count({
      where: { team_id: teamId, deleted_at: null },
    });

    return {
      message: SUCCESS_MESSAGES.TEAM_MEMBER_ADDED,
      data: {
        assignment_id: assignment.id,
        user: {
          id: assignment.user.id,
          email: assignment.user.email,
          name: assignment.user.user_information?.name || '',
          code: assignment.user.user_information?.code || '',
          avatar: assignment.user.user_information?.avatar || null,
        },
        team: {
          id: team.id,
          name: team.name,
          division: team.division,
        },
        role: {
          id: assignment.role.id,
          name: assignment.role.name,
        },
        description: dto.description || null,
        project_access: {
          count: projectCount,
          message: `User sẽ có quyền truy cập ${projectCount} dự án của team này`,
        },
        created_at: assignment.created_at,
      },
    };
  }

  async removeMember(teamId: number, userId: number) {
    // Validate team exists
    const team = await this.prisma.teams.findFirst({
      where: { id: teamId, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException(TEAM_ERRORS.TEAM_NOT_FOUND);
    }

    // Find assignment
    const assignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: userId,
        scope_type: ScopeType.TEAM,
        scope_id: teamId,
        deleted_at: null,
      },
    });

    if (!assignment) {
      throw new NotFoundException('User không phải là thành viên của team này');
    }

    // Soft delete assignment
    await this.prisma.user_role_assignment.update({
      where: { id: assignment.id },
      data: { deleted_at: new Date() },
    });

    // Also remove from all projects of this team
    const teamProjects = await this.prisma.projects.findMany({
      where: { team_id: teamId, deleted_at: null },
      select: { id: true },
    });

    const projectIds = teamProjects.map((p) => p.id);

    if (projectIds.length > 0) {
      await this.prisma.user_role_assignment.updateMany({
        where: {
          user_id: userId,
          scope_type: ScopeType.PROJECT,
          scope_id: { in: projectIds },
          deleted_at: null,
        },
        data: { deleted_at: new Date() },
      });
    }

    return {
      message: 'Đã xóa user khỏi team',
      removed_from_projects: projectIds.length,
    };
  }

  async getMembers(teamId: number) {
    const team = await this.prisma.teams.findFirst({
      where: { id: teamId, deleted_at: null },
    });

    if (!team) {
      throw new NotFoundException(TEAM_ERRORS.TEAM_NOT_FOUND);
    }

    const members = await this.getTeamMembers(teamId);

    return {
      message: 'Lấy danh sách thành viên thành công',
      data: members,
      total: members.length,
    };
  }

  private async getTeamMembers(teamId: number) {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: teamId,
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
                code: true,
                avatar: true,
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
      orderBy: { created_at: 'asc' },
    });

    return assignments.map((a) => ({
      assignment_id: a.id,
      user_id: a.user.id,
      email: a.user.email,
      name: a.user.user_information?.name || '',
      code: a.user.user_information?.code || '',
      avatar: a.user.user_information?.avatar || null,
      position: a.user.user_information?.position || null,
      level: a.user.user_information?.level || null,
      role: a.role,
      joined_at: a.created_at,
    }));
  }
}
