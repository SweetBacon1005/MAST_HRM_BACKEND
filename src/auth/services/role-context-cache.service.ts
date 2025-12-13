import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RoleAssignmentService } from './role-assignment.service';
import { ScopeType } from '@prisma/client';
import { getRoleLevel } from '../constants/role.constants';
import { PrismaService } from '../../database/prisma.service';

export interface RoleContext {
  roleId: number;
  roleName: string;
  scope: ScopeType;
  scopeId: number | null;
  scopeName: string | null;
  assignedAt: Date;
}

export interface UserRoleContexts {
  userId: number;
  email: string;
  roleContexts: RoleContext[];
  highestRoles: {
    COMPANY: string | null;
    DIVISION: Record<number, string>;
    TEAM: Record<number, string>;
    PROJECT: Record<number, string>;
  };
  cachedAt: Date;
}

@Injectable()
export class RoleContextCacheService {
  private readonly logger = new Logger(RoleContextCacheService.name);
  private readonly CACHE_TTL: number;
  private readonly CACHE_KEY_PREFIX = 'user:roles:';

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => RoleAssignmentService))
    private roleAssignmentService: RoleAssignmentService,
    private prisma: PrismaService,
  ) {
    // Get TTL from env or default to 5 minutes (300 seconds)
    this.CACHE_TTL = parseInt(process.env.ROLE_CACHE_TTL || '300', 10);
  }

  /**
   * Lấy role contexts của user (từ cache hoặc DB)
   */
  async getUserRoleContexts(userId: number): Promise<UserRoleContexts> {
    const cacheKey = this.getCacheKey(userId);

    try {
      // 1. Try cache first
      const cached = await this.cacheManager.get<UserRoleContexts>(cacheKey);

      if (cached) {
        this.logger.debug(`Cache HIT for user ${userId}`);
        return cached;
      }

      this.logger.debug(`Cache MISS for user ${userId} - loading from DB`);
    } catch (error) {
      this.logger.warn(`Cache read error for user ${userId}:`, error);
      // Continue to load from DB
    }

    // 2. Cache miss → Query DB
    const roleContexts = await this.loadRoleContextsFromDB(userId);

    // 3. Cache result
    try {
      await this.cacheManager.set(cacheKey, roleContexts, this.CACHE_TTL * 1000);
      this.logger.debug(`Cached role contexts for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to cache role contexts for user ${userId}:`, error);
      // Continue without cache - not critical
    }

    return roleContexts;
  }

  /**
   * Invalidate cache khi role thay đổi
   */
  async invalidateUserCache(userId: number): Promise<void> {
    const cacheKey = this.getCacheKey(userId);

    try {
      await this.cacheManager.del(cacheKey);
      this.logger.log(`Invalidated cache for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache của nhiều users (bulk operation)
   */
  async invalidateMultipleUsers(userIds: number[]): Promise<void> {
    this.logger.log(`Invalidating cache for ${userIds.length} users`);

    await Promise.all(
      userIds.map((userId) => this.invalidateUserCache(userId)),
    );
  }

  /**
   * Load role contexts từ database
   */
  private async loadRoleContextsFromDB(
    userId: number,
  ): Promise<UserRoleContexts> {
    // Get user info
    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Query role assignments with relations
    const userRoles = await this.roleAssignmentService.getUserRoles(userId);

    // Build role contexts with additional info
    const roleContexts: RoleContext[] = await Promise.all(
      userRoles.roles.map(async (role) => {
        let scopeName: string | null = null;

        // Get scope name if applicable
        if (role.scope_id) {
          scopeName = await this.getScopeName(role.scope_type, role.scope_id);
        }

        return {
          roleId: role.id,
          roleName: role.name,
          scope: role.scope_type,
          scopeId: role.scope_id ?? null,
          scopeName,
          assignedAt: new Date(), // TODO: Get from assignment if needed
        };
      }),
    );

    // Build highest roles map
    const highestRoles = this.buildHighestRolesMap(roleContexts);

    return {
      userId: user.id,
      email: user.email,
      roleContexts,
      highestRoles,
      cachedAt: new Date(),
    };
  }

  /**
   * Get scope name for display purposes
   */
  private async getScopeName(
    scopeType: ScopeType,
    scopeId: number,
  ): Promise<string | null> {
    try {
      switch (scopeType) {
        case ScopeType.DIVISION: {
          const division = await this.prisma.divisions.findFirst({
            where: { id: scopeId, deleted_at: null },
            select: { name: true },
          });
          return division?.name ?? null;
        }

        case ScopeType.TEAM: {
          const team = await this.prisma.teams.findFirst({
            where: { id: scopeId, deleted_at: null },
            select: { name: true },
          });
          return team?.name ?? null;
        }

        case ScopeType.PROJECT: {
          const project = await this.prisma.projects.findFirst({
            where: { id: scopeId, deleted_at: null },
            select: { name: true },
          });
          return project?.name ?? null;
        }

        default:
          return null;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to get scope name for ${scopeType} ${scopeId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Build highest roles map cho quick lookup
   */
  private buildHighestRolesMap(
    roleContexts: RoleContext[],
  ): UserRoleContexts['highestRoles'] {
    const map: UserRoleContexts['highestRoles'] = {
      COMPANY: null,
      DIVISION: {},
      TEAM: {},
      PROJECT: {},
    };

    for (const ctx of roleContexts) {
      const level = getRoleLevel(ctx.roleName);

      if (ctx.scope === ScopeType.COMPANY) {
        if (!map.COMPANY || getRoleLevel(map.COMPANY) < level) {
          map.COMPANY = ctx.roleName;
        }
      } else if (ctx.scopeId !== null) {
        const scopeMap = map[ctx.scope];
        if (
          !scopeMap[ctx.scopeId] ||
          getRoleLevel(scopeMap[ctx.scopeId]) < level
        ) {
          scopeMap[ctx.scopeId] = ctx.roleName;
        }
      }
    }

    return map;
  }

  private getCacheKey(userId: number): string {
    return `${this.CACHE_KEY_PREFIX}${userId}`;
  }

  /**
   * Get cache statistics (for monitoring)
   */
  async getCacheStats() {
    // Basic stats - can be extended based on cache-manager implementation
    return {
      ttl: this.CACHE_TTL,
      prefix: this.CACHE_KEY_PREFIX,
    };
  }
}
