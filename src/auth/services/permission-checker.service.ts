import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ROLE_NAMES } from '../constants/role.constants';

export interface UserPermissionContext {
  userId: number;
  roles: string[];
  divisionIds?: number[];
  teamIds?: number[];
}

@Injectable()
export class PermissionCheckerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra user có quyền xem request không
   */
  async canAccessRequest(
    context: UserPermissionContext,
    requestUserId: number,
    _requestType?: string,
  ): Promise<boolean> {
    // Admin có thể xem tất cả
    if (this.hasAnyRole(context.roles, [ROLE_NAMES.ADMIN])) {
      return true;
    }

    // User có thể xem request của chính mình
    if (context.userId === requestUserId) {
      return true;
    }

    // Division Head có thể xem request trong division
    if (this.hasRole(context.roles, ROLE_NAMES.DIVISION_HEAD)) {
      return await this.isInSameDivision(context.userId, requestUserId);
    }

    // Team Leader có thể xem request trong team
    if (this.hasRole(context.roles, ROLE_NAMES.TEAM_LEADER)) {
      return await this.isInSameTeam(context.userId, requestUserId);
    }

    return false;
  }

  /**
   * Lấy danh sách user IDs mà user hiện tại có thể truy cập
   */
  async getAccessibleUserIds(context: UserPermissionContext): Promise<number[]> {
    // Admin có thể truy cập tất cả users
    if (this.hasAnyRole(context.roles, [ROLE_NAMES.ADMIN])) {
      const users = await this.prisma.users.findMany({
        where: { deleted_at: null },
        select: { id: true },
      });
      return users.map(u => u.id);
    }

    const accessibleIds = new Set<number>();
    accessibleIds.add(context.userId); // Luôn có thể truy cập chính mình

    // Division Head có thể truy cập users trong division
    if (this.hasRole(context.roles, ROLE_NAMES.DIVISION_HEAD)) {
      const divisionUserIds = await this.getUsersInDivisions(context.userId);
      divisionUserIds.forEach(id => accessibleIds.add(id));
    }

    // Team Leader có thể truy cập users trong team
    if (this.hasRole(context.roles, ROLE_NAMES.TEAM_LEADER)) {
      const teamUserIds = await this.getUsersInTeams(context.userId);
      teamUserIds.forEach(id => accessibleIds.add(id));
    }

    return Array.from(accessibleIds);
  }

  /**
   * Kiểm tra có role cụ thể không
   */
  private hasRole(userRoles: string[], role: string): boolean {
    return userRoles?.includes(role) || false;
  }

  /**
   * Kiểm tra có bất kỳ role nào trong danh sách không
   */
  private hasAnyRole(userRoles: string[], roles: string[]): boolean {
    if (!userRoles || userRoles.length === 0) return false;
    return roles.some(role => userRoles.includes(role));
  }

  /**
   * Kiểm tra 2 user có cùng division không
   */
  private async isInSameDivision(userId1: number, userId2: number): Promise<boolean> {
    const user1Divisions = await this.getUserDivisions(userId1);
    const user2Divisions = await this.getUserDivisions(userId2);
    
    return user1Divisions.some(divId => user2Divisions.includes(divId));
  }

  /**
   * Kiểm tra 2 user có cùng team không
   */
  private async isInSameTeam(userId1: number, userId2: number): Promise<boolean> {
    const user1Teams = await this.getUserTeams(userId1);
    const user2Teams = await this.getUserTeams(userId2);
    
    return user1Teams.some(teamId => user2Teams.includes(teamId));
  }

  /**
   * Lấy danh sách division IDs của user
   */
  private async getUserDivisions(userId: number): Promise<number[]> {
    const userDivisions = await this.prisma.user_division.findMany({
      where: { 
        userId: userId,
        division: { deleted_at: null }
      },
      select: { divisionId: true },
    });
    
    return userDivisions.map(ud => ud.divisionId).filter(id => id !== null) as number[];
  }

  /**
   * Lấy danh sách team IDs của user
   */
  private async getUserTeams(userId: number): Promise<number[]> {
    const userTeams = await this.prisma.user_division.findMany({
      where: { 
        userId: userId,
        team: { deleted_at: null }
      },
      select: { teamId: true },
    });
    
    return userTeams.map(ut => ut.teamId).filter(id => id !== null) as number[];
  }

  /**
   * Lấy tất cả user IDs trong divisions mà user quản lý
   */
  private async getUsersInDivisions(managerId: number): Promise<number[]> {
    const divisions = await this.getUserDivisions(managerId);
    
    if (divisions.length === 0) return [];

    const users = await this.prisma.user_division.findMany({
      where: {
        divisionId: { in: divisions },
        division: { deleted_at: null },
        user: { deleted_at: null },
      },
      select: { userId: true },
    });

    return users.map(u => u.userId);
  }

  /**
   * Lấy tất cả user IDs trong teams mà user quản lý
   */
  private async getUsersInTeams(leaderId: number): Promise<number[]> {
    const teams = await this.getUserTeams(leaderId);
    
    if (teams.length === 0) return [];

    const users = await this.prisma.user_division.findMany({
      where: {
        teamId: { in: teams },
        team: { deleted_at: null },
        user: { deleted_at: null },
      },
      select: { userId: true },
    });

    return users.map(u => u.userId);
  }

  /**
   * Tạo context từ user hiện tại
   */
  async createUserContext(userId: number, roles: string[]): Promise<UserPermissionContext> {
    const [divisionIds, teamIds] = await Promise.all([
      this.getUserDivisions(userId),
      this.getUserTeams(userId),
    ]);

    return {
      userId,
      roles: roles || [],
      divisionIds,
      teamIds,
    };
  }
}
