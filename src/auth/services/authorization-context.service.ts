import { Injectable, Logger } from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { AUTHORIZATION_ERRORS } from '../../common/constants/error-messages.constants';
import { PrismaService } from '../../database/prisma.service';
import { ROLE_NAMES } from '../constants/role.constants';
import { RoleContext } from './role-context-cache.service';

export interface AuthorizationContext {
  userId: number;
  email: string;
  roleContexts: RoleContext[];
  highestRoles: {
    COMPANY: string | null;
    DIVISION: Record<number, string>;
    TEAM: Record<number, string>;
    PROJECT: Record<number, string>;
  };

  hasRole(roleName: string, scope?: ScopeType, scopeId?: number): boolean;
  hasAnyRole(roleNames: string[], scope?: ScopeType, scopeId?: number): boolean;
  getHighestRole(scope: ScopeType, scopeId?: number): string | null;
  canAccessResource(resourceType: string, resourceId: number): Promise<boolean>;
  canApproveRequest(
    requestOwnerId: number,
    requestType: string,
  ): Promise<boolean>;
}

@Injectable()
export class AuthorizationContextService {
  private readonly logger = new Logger(AuthorizationContextService.name);

  constructor(private prisma: PrismaService) {}

  async createContext(user: any): Promise<AuthorizationContext> {
    if (!user.roleContexts) {
      this.logger.warn(
        `User ${user.id}: ${AUTHORIZATION_ERRORS.USER_NO_ROLE_CONTEXTS}`,
      );
      user.roleContexts = [];
      user.highestRoles = {
        COMPANY: null,
        DIVISION: {},
        TEAM: {},
        PROJECT: {},
      };
    }

    const self = this;

    return {
      userId: user.id,
      email: user.email,
      roleContexts: user.roleContexts,
      highestRoles: user.highestRoles,

      hasRole(roleName: string, scope?: ScopeType, scopeId?: number): boolean {
        return self.hasRole(user.roleContexts, roleName, scope, scopeId);
      },

      hasAnyRole(
        roleNames: string[],
        scope?: ScopeType,
        scopeId?: number,
      ): boolean {
        return self.hasAnyRole(user.roleContexts, roleNames, scope, scopeId);
      },

      getHighestRole(scope: ScopeType, scopeId?: number): string | null {
        return self.getHighestRole(user.highestRoles, scope, scopeId);
      },

      canAccessResource(
        resourceType: string,
        resourceId: number,
      ): Promise<boolean> {
        return self.checkResourceAccess(user, resourceType, resourceId);
      },

      canApproveRequest(
        requestOwnerId: number,
        requestType: string,
      ): Promise<boolean> {
        return self.checkApprovalPermission(user, requestOwnerId, requestType);
      },
    };
  }

  private hasRole(
    roleContexts: RoleContext[],
    roleName: string,
    scope?: ScopeType,
    scopeId?: number,
  ): boolean {
    if (!scope) {
      return roleContexts.some((ctx) => ctx.roleName === roleName);
    }

    if (scopeId === undefined) {
      return roleContexts.some(
        (ctx) => ctx.roleName === roleName && ctx.scope === scope,
      );
    }

    return roleContexts.some(
      (ctx) =>
        ctx.roleName === roleName &&
        ctx.scope === scope &&
        ctx.scopeId === scopeId,
    );
  }

  private hasAnyRole(
    roleContexts: RoleContext[],
    roleNames: string[],
    scope?: ScopeType,
    scopeId?: number,
  ): boolean {
    return roleNames.some((roleName) =>
      this.hasRole(roleContexts, roleName, scope, scopeId),
    );
  }

  private getHighestRole(
    highestRoles: any,
    scope: ScopeType,
    scopeId?: number,
  ): string | null {
    if (scope === ScopeType.COMPANY) {
      return highestRoles.COMPANY;
    }

    if (scopeId !== undefined) {
      return highestRoles[scope]?.[scopeId] || null;
    }

    return null;
  }

  private async checkApprovalPermission(
    user: any,
    requestOwnerId: number,
    requestType: string,
  ): Promise<boolean> {
    if (this.hasRole(user.roleContexts, ROLE_NAMES.ADMIN, ScopeType.COMPANY)) {
      return true;
    }

    const owner = await this.prisma.users.findFirst({
      where: { id: requestOwnerId, deleted_at: null },
      include: {
        user_role_assignments: {
          where: { deleted_at: null },
          include: { role: true },
        },
      },
    });

    if (!owner) {
      this.logger.warn(
        `${AUTHORIZATION_ERRORS.REQUEST_OWNER_NOT_FOUND}: ${requestOwnerId}`,
      );
      return false;
    }

    const ownerDivisions = owner.user_role_assignments
      .filter((a) => a.scope_type === 'DIVISION')
      .map((a) => a.scope_id)
      .filter((id): id is number => id !== null);

    const ownerTeams = owner.user_role_assignments
      .filter((a) => a.scope_type === 'TEAM')
      .map((a) => a.scope_id)
      .filter((id): id is number => id !== null);

    const ownerProjects = owner.user_role_assignments
      .filter((a) => a.scope_type === 'PROJECT')
      .map((a) => a.scope_id)
      .filter((id): id is number => id !== null);

    for (const divisionId of ownerDivisions) {
      if (
        this.hasRole(
          user.roleContexts,
          ROLE_NAMES.DIVISION_HEAD,
          ScopeType.DIVISION,
          divisionId,
        )
      ) {
        this.logger.debug(
          `Người dùng ${user.id} có thể duyệt với vai trò Trưởng phòng của phòng ban ${divisionId}`,
        );
        return true;
      }
    }

    for (const teamId of ownerTeams) {
      if (
        this.hasRole(
          user.roleContexts,
          ROLE_NAMES.TEAM_LEADER,
          ScopeType.TEAM,
          teamId,
        )
      ) {
        this.logger.debug(
          `Người dùng ${user.id} có thể duyệt với vai trò Trưởng nhóm của nhóm ${teamId}`,
        );
        return true;
      }
    }

    for (const projectId of ownerProjects) {
      if (
        this.hasRole(
          user.roleContexts,
          ROLE_NAMES.PROJECT_MANAGER,
          ScopeType.PROJECT,
          projectId,
        )
      ) {
        this.logger.debug(
          `Người dùng ${user.id} có thể duyệt với vai trò Project Manager của dự án ${projectId}`,
        );
        return true;
      }
    }

    if (
      ['day-off', 'remote-work', 'day_off', 'remote_work'].includes(
        requestType,
      ) &&
      this.hasRole(user.roleContexts, ROLE_NAMES.HR_MANAGER, ScopeType.COMPANY)
    ) {
      this.logger.debug(
        `Người dùng ${user.id} có thể duyệt với vai trò HR Manager`,
      );
      return true;
    }

    this.logger.debug(
      `Người dùng ${user.id} không có quyền duyệt yêu cầu của người dùng ${requestOwnerId}`,
    );
    return false;
  }

  private async checkResourceAccess(
    user: any,
    resourceType: string,
    resourceId: number,
  ): Promise<boolean> {
    if (this.hasRole(user.roleContexts, ROLE_NAMES.ADMIN, ScopeType.COMPANY)) {
      return true;
    }

    switch (resourceType) {
      case 'division':
        return this.hasRole(
          user.roleContexts,
          ROLE_NAMES.DIVISION_HEAD,
          ScopeType.DIVISION,
          resourceId,
        );

      case 'team':
        return this.hasRole(
          user.roleContexts,
          ROLE_NAMES.TEAM_LEADER,
          ScopeType.TEAM,
          resourceId,
        );

      case 'project':
        return this.hasRole(
          user.roleContexts,
          ROLE_NAMES.PROJECT_MANAGER,
          ScopeType.PROJECT,
          resourceId,
        );

      default:
        return false;
    }
  }
}
