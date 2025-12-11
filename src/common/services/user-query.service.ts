import { Injectable } from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/**
 * Shared service để query user data
 * Giảm code trùng lặp trong toàn bộ dự án
 */
@Injectable()
export class UserQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách user IDs theo division hoặc team
   * Pattern này được sử dụng rất nhiều trong reports, timesheet, attendance
   */
  async getuser_idsByDivisionOrTeam(params: {
    division_id?: number;
    team_id?: number;
  }): Promise<number[]> {
    const { division_id, team_id } = params;

    if (!division_id && !team_id) {
      return [];
    }

    if (team_id) {
      const teamAssignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.TEAM,
          scope_id: Number(team_id),
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      return teamAssignments.map((assignment) => assignment.user_id);
    }

    if (division_id) {
      const divisionAssignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.DIVISION,
          scope_id: Number(division_id),
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      return divisionAssignments.map((assignment) => assignment.user_id);
    }

    return [];
  }

  /**
   * Lấy thông tin users với division details
   * Sử dụng cho các báo cáo cần hiển thị thông tin user + phòng ban
   */
  async getUsersWithDivision(user_ids: number[]) {
    if (user_ids.length === 0) {
      return [];
    }

    const users = await this.prisma.users.findMany({
      where: { id: { in: user_ids }, deleted_at: null },
      select: {
        id: true,
        user_information: { select: { name: true, avatar: true } },
        email: true,
      },
    });

    // Lấy division info từ user_role_assignment
    const divisionAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: { in: user_ids },
        scope_type: ScopeType.DIVISION,
        deleted_at: null,
        scope_id: { not: null },
      },
      include: {
        // Lấy division info
      },
    });

    const division_ids = [...new Set(divisionAssignments.map((a) => a.scope_id).filter((id): id is number => id !== null))];
    const divisions = await this.prisma.divisions.findMany({
      where: { id: { in: division_ids } },
      select: { id: true, name: true },
    });

    const divisionMap = new Map(divisions.map((d) => [d.id, d]));
    const userDivisionMap = new Map<number, { id: number; name: string }>();
    divisionAssignments.forEach((assignment) => {
      if (assignment.scope_id && !userDivisionMap.has(assignment.user_id)) {
        const division = divisionMap.get(assignment.scope_id);
        if (division) {
          userDivisionMap.set(assignment.user_id, division);
        }
      }
    });

    // Format response giống như user_division cũ
    return users.map((user) => {
      const division = userDivisionMap.get(user.id);
      return {
        ...user,
        user_division: division
          ? [
              {
                division,
              },
            ]
          : [],
      };
    });
  }

  /**
   * Lấy basic user info (id, name, email)
   * Sử dụng khi không cần thông tin division
   */
  async getBasicUserInfo(user_ids: number[]) {
    if (user_ids.length === 0) {
      return [];
    }

    return this.prisma.users.findMany({
      where: { id: { in: user_ids }, deleted_at: null },
      select: {
        id: true,
        user_information: { select: { name: true, avatar: true } },
        email: true,
      },
    });
  }

  /**
   * Check xem user có thuộc division/team không - TYPE SAFE
   */
  async isUserInDivisionOrTeam(
    user_id: number,
    division_id?: number,
    team_id?: number,
  ): Promise<boolean> {
    if (!division_id && !team_id) {
      return false;
    }

    if (team_id) {
      const assignment = await this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: user_id,
          scope_type: ScopeType.TEAM,
          scope_id: team_id,
          deleted_at: null,
        },
      });
      return !!assignment;
    } else if (division_id) {
      const assignment = await this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: user_id,
          scope_type: ScopeType.DIVISION,
          scope_id: division_id,
          deleted_at: null,
        },
      });
      return !!assignment;
    }

    return false;
  }
}

