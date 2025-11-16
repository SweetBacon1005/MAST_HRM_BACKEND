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
  async getUserIdsByDivisionOrTeam(params: {
    divisionId?: number;
    teamId?: number;
  }): Promise<number[]> {
    const { divisionId, teamId } = params;

    if (!divisionId && !teamId) {
      return [];
    }

    if (teamId) {
      const teamAssignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.TEAM,
          scope_id: Number(teamId),
          deleted_at: null,
        },
        select: { user_id: true },
        distinct: ['user_id'],
      });
      return teamAssignments.map((assignment) => assignment.user_id);
    }

    if (divisionId) {
      const divisionAssignments = await this.prisma.user_role_assignment.findMany({
        where: {
          scope_type: ScopeType.DIVISION,
          scope_id: Number(divisionId),
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
  async getUsersWithDivision(userIds: number[]) {
    if (userIds.length === 0) {
      return [];
    }

    const users = await this.prisma.users.findMany({
      where: { id: { in: userIds }, deleted_at: null },
      select: {
        id: true,
        user_information: { select: { name: true, avatar: true } },
        email: true,
      },
    });

    // Lấy division info từ user_role_assignment
    const divisionAssignments = await this.prisma.user_role_assignment.findMany({
      where: {
        user_id: { in: userIds },
        scope_type: ScopeType.DIVISION,
        deleted_at: null,
        scope_id: { not: null },
      },
      include: {
        // Lấy division info
      },
    });

    const divisionIds = [...new Set(divisionAssignments.map((a) => a.scope_id).filter((id): id is number => id !== null))];
    const divisions = await this.prisma.divisions.findMany({
      where: { id: { in: divisionIds } },
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
  async getBasicUserInfo(userIds: number[]) {
    if (userIds.length === 0) {
      return [];
    }

    return this.prisma.users.findMany({
      where: { id: { in: userIds }, deleted_at: null },
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
    userId: number,
    divisionId?: number,
    teamId?: number,
  ): Promise<boolean> {
    if (!divisionId && !teamId) {
      return false;
    }

    if (teamId) {
      const assignment = await this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: userId,
          scope_type: ScopeType.TEAM,
          scope_id: teamId,
          deleted_at: null,
        },
      });
      return !!assignment;
    } else if (divisionId) {
      const assignment = await this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: userId,
          scope_type: ScopeType.DIVISION,
          scope_id: divisionId,
          deleted_at: null,
        },
      });
      return !!assignment;
    }

    return false;
  }
}

