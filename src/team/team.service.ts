import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { ROLE_IDS } from '../auth/constants/role.constants';
import { RoleAssignmentService } from '../auth/services/role-assignment.service';
import {
  SUCCESS_MESSAGES,
  TEAM_ERRORS,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import {
  CreateTeamDto,
  TeamPaginationDto,
  UpdateTeamDto,
} from '../division/dto/team.dto';
import { AddTeamMemberDto } from './dto/add-member.dto';

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
        const leaderAssignment =
          await this.prisma.user_role_assignment.findFirst({
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

        const manager = leaderAssignment
          ? {
              id: leaderAssignment.user.id,
              name: leaderAssignment.user.user_information?.name || '',
              email: leaderAssignment.user.email,
              avatar: leaderAssignment.user.user_information?.avatar || null,
            }
          : null;

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
                  select: { name: true, avatar: true },
                },
              },
            },
          },
        });

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

    const userIds = dto.members.map((m) => m.user_id);
    
    // Validate all users exist
    const users = await this.prisma.users.findMany({
      where: { 
        id: { in: userIds },
        deleted_at: null 
      },
      include: {
        user_information: {
          select: { name: true, code: true, avatar: true },
        },
      },
    });

    if (users.length !== userIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missingIds = userIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Không tìm thấy user(s) với ID: ${missingIds.join(', ')}`,
      );
    }

    // Check for duplicate user_ids in request
    const uniqueUserIds = new Set(userIds);
    if (uniqueUserIds.size !== userIds.length) {
      throw new BadRequestException(
        'Danh sách users không được trùng lặp',
      );
    }

    // Check which users are already in THIS team
    const existingAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: { in: userIds },
        scope_type: ScopeType.TEAM,
        scope_id: teamId,
        deleted_at: null,
      },
      select: { user_id: true },
    });

    const existingUserIds = new Set(
      existingAssignments.map((a) => a.user_id),
    );
    const alreadyInTeam = userIds.filter((id) => existingUserIds.has(id));

    if (alreadyInTeam.length > 0) {
      throw new BadRequestException(
        `User(s) với ID ${alreadyInTeam.join(', ')} đã là thành viên của team này`,
      );
    }

    // Validate all users belong to the same division
    // Get all division assignments and group by user_id to get the latest one
    const allDivisionAssignments =
      await this.prisma.user_role_assignment.findMany({
        where: {
          user_id: { in: userIds },
          scope_type: ScopeType.DIVISION,
          deleted_at: null,
          scope_id: { not: null },
        },
        orderBy: { created_at: 'desc' },
      });

    // Group by user_id and take the first (latest) one for each user
    const userDivisionMap = new Map<number, number | null>();
    for (const assignment of allDivisionAssignments) {
      if (!userDivisionMap.has(assignment.user_id) && assignment.scope_id) {
        userDivisionMap.set(assignment.user_id, assignment.scope_id);
      }
    }

    const usersWithoutDivision = userIds.filter(
      (id) => !userDivisionMap.has(id),
    );
    if (usersWithoutDivision.length > 0) {
      throw new BadRequestException(
        `User(s) với ID ${usersWithoutDivision.join(', ')} chưa được gán vào division nào`,
      );
    }

    const usersInDifferentDivision = userIds.filter(
      (id) => userDivisionMap.get(id) !== team.division_id,
    );
    if (usersInDifferentDivision.length > 0) {
      throw new BadRequestException(
        `User(s) với ID ${usersInDifferentDivision.join(', ')} thuộc division khác. Chỉ có thể thêm user từ division ${team.division?.name || team.division_id}`,
      );
    }

    // Validate all roles exist (if specified)
    const roleIds = dto.members
      .map((m) => m.role_id)
      .filter((id): id is number => id !== undefined);
    
    if (roleIds.length > 0) {
      const uniqueRoleIds = [...new Set(roleIds)];
      const roles = await this.prisma.roles.findMany({
        where: { 
          id: { in: uniqueRoleIds },
          deleted_at: null 
        },
      });

      if (roles.length !== uniqueRoleIds.length) {
        const foundRoleIds = new Set(roles.map((r) => r.id));
        const missingRoleIds = uniqueRoleIds.filter(
          (id) => !foundRoleIds.has(id),
        );
        throw new NotFoundException(
          `Không tìm thấy role(s) với ID: ${missingRoleIds.join(', ')}`,
        );
      }
    }

    // Create team memberships in batch
    const assignmentsData = dto.members.map((member) => ({
      user_id: member.user_id,
      role_id: member.role_id || ROLE_IDS.EMPLOYEE,
      scope_type: ScopeType.TEAM,
      scope_id: teamId,
      assigned_by: assignedBy,
    }));

    const assignments = await Promise.all(
      assignmentsData.map((data) =>
        this.prisma.user_role_assignment.create({
          data,
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
        }),
      ),
    );

    return {
      message: `Đã thêm ${assignments.length} thành viên vào team thành công`,
      data: {
        team: {
          id: team.id,
          name: team.name,
          division: team.division,
        },
        members: assignments.map((assignment, index) => ({
          assignment_id: assignment.id,
          user: {
            id: assignment.user.id,
            email: assignment.user.email,
            name: assignment.user.user_information?.name || '',
            code: assignment.user.user_information?.code || '',
            avatar: assignment.user.user_information?.avatar || null,
          },
          role: {
            id: assignment.role.id,
            name: assignment.role.name,
          },
          description: dto.members[index].description || null,
          created_at: assignment.created_at,
        })),
        total: assignments.length,
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

    // Soft delete team assignment only
    await this.prisma.user_role_assignment.update({
      where: { id: assignment.id },
      data: { deleted_at: new Date() },
    });

    return {
      message: 'Đã xóa user khỏi team',
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

  async getAvailableMembers(teamId: number) {
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

    if (!team.division_id) {
      throw new BadRequestException('Team không thuộc division nào');
    }

    // Get all users in the division
    const divisionUsers = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.DIVISION,
        scope_id: team.division_id,
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
              },
            },
          },
        },
      },
    });

    // Get current team members
    const currentMembers = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.TEAM,
        scope_id: teamId,
        deleted_at: null,
      },
      select: { user_id: true },
    });

    const currentMemberIds = new Set(currentMembers.map((m) => m.user_id));

    // Filter out current members
    const availableUsers = divisionUsers
      .filter((assignment) => !currentMemberIds.has(assignment.user_id))
      .map((assignment) => ({
        user_id: assignment.user.id,
        email: assignment.user.email,
        name: assignment.user.user_information?.name || '',
        code: assignment.user.user_information?.code || '',
        avatar: assignment.user.user_information?.avatar || null,
        position: assignment.user.user_information?.position || null,
      }));

    return {
      message: `Có ${availableUsers.length} users có thể thêm vào team ${team.name}`,
      data: availableUsers,
      total: availableUsers.length,
      team: {
        id: team.id,
        name: team.name,
        division: team.division,
      },
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
      role: a.role,
      joined_at: a.created_at,
    }));
  }

  async getMyManagedTeams(userId: number) {
    // Lấy tất cả team assignments với role TEAM_LEADER của user
    const teamAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: userId,
        role_id: ROLE_IDS.TEAM_LEADER,
        scope_type: ScopeType.TEAM,
        deleted_at: null,
        scope_id: { not: null },
      },
      select: {
        scope_id: true,
      },
    });

    const teamIds = teamAssignments
      .map((a) => a.scope_id)
      .filter((id): id is number => id !== null);

    if (teamIds.length === 0) {
      return {
        message: 'Bạn chưa quản lý team nào',
        data: [],
        total: 0,
      };
    }

    // Lấy thông tin teams
    const validTeams = await this.prisma.teams.findMany({
      where: {
        id: { in: teamIds },
        deleted_at: null,
      },
      include: {
        division: {
          select: { id: true, name: true },
        },
      },
    });

    // Get member counts and active projects in parallel
    const [memberCounts, activeProjects] = await Promise.all([
      this.prisma.user_role_assignment.groupBy({
        by: ['scope_id'],
        where: {
          scope_type: ScopeType.TEAM,
          scope_id: { in: teamIds },
          deleted_at: null,
        },
        _count: { user_id: true },
      }),
      this.prisma.projects.findMany({
        where: {
          team_id: { in: teamIds },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          deleted_at: null,
        },
        select: {
          id: true,
          name: true,
          team_id: true,
        },
      }),
    ]);

    const memberCountMap = new Map(
      memberCounts.map((mc) => [mc.scope_id, mc._count.user_id]),
    );

    const projectsByTeam = new Map<number, Array<{ id: number; name: string }>>();
    activeProjects.forEach((project) => {
      if (project.team_id) {
        if (!projectsByTeam.has(project.team_id)) {
          projectsByTeam.set(project.team_id, []);
        }
        projectsByTeam.get(project.team_id)?.push({
          id: project.id,
          name: project.name,
        });
      }
    });

    // Transform data
    const transformedData = validTeams.map((team) => ({
      id: team.id,
      name: team.name,
      division_id: team.division_id,
      division: team.division
        ? {
            id: team.division.id,
            name: team.division.name,
          }
        : null,
      member_count: memberCountMap.get(team.id) || 0,
      active_projects: projectsByTeam.get(team.id) || [],
      founding_date: team.founding_date
        ? team.founding_date.toISOString().split('T')[0]
        : null,
      created_at: team.created_at,
    }));

    return {
      message: 'Lấy danh sách teams đang quản lý thành công',
      data: transformedData,
      total: transformedData.length,
    };
  }
}
