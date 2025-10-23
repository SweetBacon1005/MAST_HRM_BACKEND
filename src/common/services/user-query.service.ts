import { Injectable } from '@nestjs/common';
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
      const teamMembers = await this.prisma.user_division.findMany({
        where: { teamId: Number(teamId) },
        select: { userId: true },
      });
      return teamMembers.map((member) => member.userId);
    }

    if (divisionId) {
      const divisionMembers = await this.prisma.user_division.findMany({
        where: { divisionId: Number(divisionId) },
        select: { userId: true },
      });
      return divisionMembers.map((member) => member.userId);
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

    return this.prisma.users.findMany({
      where: { id: { in: userIds }, deleted_at: null },
      select: {
        id: true,
        user_information: { select: { name: true, avatar: true } },
        email: true,
        user_division: {
          include: {
            division: {
              select: { id: true, name: true },
            },
          },
        },
      },
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

    const where: { userId: number; teamId?: number; divisionId?: number } = {
      userId,
    };

    if (teamId) {
      where.teamId = teamId;
    } else if (divisionId) {
      where.divisionId = divisionId;
    }

    const count = await this.prisma.user_division.count({ where });
    return count > 0;
  }
}

