import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ROLE_NAMES } from '../constants/role.constants';

export interface UserPermissionContext {
  user_id: number;
  roles: string[];
  division_ids?: number[];
  team_ids?: number[];
}

@Injectable()
export class PermissionCheckerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra user có quyền xem request không
   */
  async canAccessRequest(
    context: UserPermissionContext,
    requestuser_id: number,
    _requestType?: string,
  ): Promise<boolean> {
    // Admin có thể xem tất cả
    if (this.hasAnyRole(context.roles, [ROLE_NAMES.ADMIN])) {
      return true;
    }

    // User có thể xem request của chính mình
    if (context.user_id === requestuser_id) {
      return true;
    }

    // Division Head có thể xem request trong division
    if (this.hasRole(context.roles, ROLE_NAMES.DIVISION_HEAD)) {
      return await this.isInSameDivision(context.user_id, requestuser_id);
    }

    // Team Leader có thể xem request trong team
    if (this.hasRole(context.roles, ROLE_NAMES.TEAM_LEADER)) {
      return await this.isInSameTeam(context.user_id, requestuser_id);
    }

    return false;
  }

  /**
   * Lấy danh sách user IDs mà user hiện tại có thể truy cập
   */
  async getAccessibleuser_ids(context: UserPermissionContext): Promise<number[]> {
    // Admin có thể truy cập tất cả users
    if (this.hasAnyRole(context.roles, [ROLE_NAMES.ADMIN])) {
      const users = await this.prisma.users.findMany({
        where: { deleted_at: null },
        select: { id: true },
      });
      return users.map(u => u.id);
    }

    const accessibleIds = new Set<number>();
    accessibleIds.add(context.user_id); // Luôn có thể truy cập chính mình

    // Division Head có thể truy cập users trong division
    if (this.hasRole(context.roles, ROLE_NAMES.DIVISION_HEAD)) {
      const divisionuser_ids = await this.getUsersInDivisions(context.user_id);
      divisionuser_ids.forEach(id => accessibleIds.add(id));
    }

    // Team Leader có thể truy cập users trong team
    if (this.hasRole(context.roles, ROLE_NAMES.TEAM_LEADER)) {
      const teamuser_ids = await this.getUsersInTeams(context.user_id);
      teamuser_ids.forEach(id => accessibleIds.add(id));
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
  private async isInSameDivision(user_id1: number, user_id2: number): Promise<boolean> {
    const user1Divisions = await this.getUserDivisions(user_id1);
    const user2Divisions = await this.getUserDivisions(user_id2);
    
    return user1Divisions.some(divId => user2Divisions.includes(divId));
  }

  /**
   * Kiểm tra 2 user có cùng team không
   */
  private async isInSameTeam(user_id1: number, user_id2: number): Promise<boolean> {
    const user1Teams = await this.getUserTeams(user_id1);
    const user2Teams = await this.getUserTeams(user_id2);
    
    return user1Teams.some(team_id => user2Teams.includes(team_id));
  }

  /**
   * Lấy danh sách division IDs của user
   */
  private async getUserDivisions(user_id: number): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: { 
        user_id: user_id,
        scope_type: 'DIVISION',
        deleted_at: null,
        scope_id: { not: null },
      },
      select: { scope_id: true },
    });
    
    return assignments.map(a => a.scope_id).filter((id): id is number => id !== null);
  }

  /**
   * Lấy danh sách team IDs của user
   */
  private async getUserTeams(user_id: number): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: { 
        user_id: user_id,
        scope_type: 'TEAM',
        deleted_at: null,
        scope_id: { not: null },
      },
      select: { scope_id: true },
    });
    
    return assignments.map(a => a.scope_id).filter((id): id is number => id !== null);
  }

  /**
   * Lấy tất cả user IDs trong divisions mà user quản lý
   */
  private async getUsersInDivisions(managerId: number): Promise<number[]> {
    const divisions = await this.getUserDivisions(managerId);
    
    if (divisions.length === 0) return [];

    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: 'DIVISION',
        scope_id: { in: divisions },
        deleted_at: null,
      },
      select: { user_id: true },
      distinct: ['user_id'],
    });

    return assignments.map(a => a.user_id);
  }

  /**
   * Lấy tất cả user IDs trong teams mà user quản lý
   */
  private async getUsersInTeams(leader_id: number): Promise<number[]> {
    const teams = await this.getUserTeams(leader_id);
    
    if (teams.length === 0) return [];

    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: 'TEAM',
        scope_id: { in: teams },
        deleted_at: null,
      },
      select: { user_id: true },
      distinct: ['user_id'],
    });

    return assignments.map(a => a.user_id);
  }

  /**
   * Tạo context từ user hiện tại
   */
  async createUserContext(user_id: number, roles: string[]): Promise<UserPermissionContext> {
    const [division_ids, team_ids] = await Promise.all([
      this.getUserDivisions(user_id),
      this.getUserTeams(user_id),
    ]);

    return {
      user_id,
      roles: roles || [],
      division_ids,
      team_ids,
    };
  }
}
