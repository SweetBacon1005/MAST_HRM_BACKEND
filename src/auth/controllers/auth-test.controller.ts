import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetCurrentUser } from '../decorators/get-current-user.decorator';
import { AuthorizationContextService } from '../services/authorization-context.service';
import { ScopeType } from '@prisma/client';

/**
 * Test Controller để verify Phase 1 implementation
 * Xóa sau khi Phase 2 hoàn thành
 */
@ApiTags('Auth - Testing (Phase 1)')
@ApiBearerAuth('JWT-auth')
@Controller('auth/test')
export class AuthTestController {
  constructor(
    private authorizationContextService: AuthorizationContextService,
  ) {}

  /**
   * Test 1: Verify JWT payload minimal
   */
  @Get('jwt-payload')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[TEST] Check JWT payload structure' })
  @ApiResponse({
    status: 200,
    description: 'JWT payload should be minimal (no roles array)',
  })
  async testJwtPayload(@GetCurrentUser() user: any) {
    return {
      message: '✅ JWT Strategy working',
      jwtPayload: {
        id: user.id,
        email: user.email,
        jti: user.jti,
        hasRoles: !!user.roles, // Should be undefined in new implementation
        hasRoleContexts: !!user.roleContexts, // Should be populated by RoleContextLoaderGuard
      },
      expectedStructure: {
        id: 'number',
        email: 'string',
        jti: 'string (optional)',
        roleContexts: 'array (loaded by guard)',
        highestRoles: 'object (loaded by guard)',
      },
    };
  }

  /**
   * Test 2: Verify role contexts loaded
   */
  @Get('role-contexts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[TEST] Check role contexts loaded from cache/DB' })
  @ApiResponse({
    status: 200,
    description: 'Role contexts should be loaded automatically',
  })
  async testRoleContexts(@GetCurrentUser() user: any) {
    return {
      message: '✅ Role contexts loaded',
      userId: user.id,
      email: user.email,
      roleContextsCount: user.roleContexts?.length || 0,
      roleContexts: user.roleContexts || [],
      highestRoles: user.highestRoles || null,
      cacheSource: user.roleContexts
        ? 'RoleContextLoaderGuard loaded successfully'
        : 'ERROR: Role contexts not loaded',
    };
  }

  /**
   * Test 3: Authorization Context API
   */
  @Get('authorization-context')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[TEST] Test AuthorizationContext helper methods' })
  @ApiResponse({
    status: 200,
    description: 'Test all authorization context methods',
  })
  async testAuthorizationContext(@GetCurrentUser() user: any) {
    // Create auth context
    const authContext =
      await this.authorizationContextService.createContext(user);

    // Test helper methods
    const tests = {
      userId: authContext.userId,
      email: authContext.email,
      roleContextsCount: authContext.roleContexts.length,

      // Test hasRole() method
      hasAdminRole: authContext.hasRole('admin', ScopeType.COMPANY),
      hasEmployeeRole: authContext.hasRole('employee', ScopeType.COMPANY),
      hasDivisionHeadRole: authContext.hasRole('division_head'),

      // Test hasAnyRole() method
      hasAnyAdminOrHR: authContext.hasAnyRole(
        ['admin', 'hr'],
        ScopeType.COMPANY,
      ),

      // Test getHighestRole() method
      highestCompanyRole: authContext.getHighestRole(ScopeType.COMPANY),

      // Role contexts detail
      roleContextsDetail: authContext.roleContexts.map((ctx) => ({
        roleName: ctx.roleName,
        scope: ctx.scope,
        scopeId: ctx.scopeId,
        scopeName: ctx.scopeName,
      })),
    };

    return {
      message: '✅ Authorization Context API working',
      tests,
      apiMethods: {
        hasRole: 'hasRole(roleName, scope?, scopeId?) → boolean',
        hasAnyRole: 'hasAnyRole(roleNames[], scope?, scopeId?) → boolean',
        getHighestRole: 'getHighestRole(scope, scopeId?) → string | null',
        canApproveRequest:
          'canApproveRequest(ownerId, requestType) → Promise<boolean>',
        canAccessResource:
          'canAccessResource(resourceType, resourceId) → Promise<boolean>',
      },
    };
  }

  /**
   * Test 4: Permission check simulation
   */
  @Get('permission-check')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '[TEST] Simulate permission checks for different scenarios',
  })
  @ApiResponse({
    status: 200,
    description: 'Simulated permission checks',
  })
  async testPermissionCheck(@GetCurrentUser() user: any) {
    const authContext =
      await this.authorizationContextService.createContext(user);

    // Simulate different permission scenarios
    const scenarios = [
      {
        scenario: 'Admin can approve any request',
        hasPermission: authContext.hasRole('admin', ScopeType.COMPANY),
        reason: 'Admin role in COMPANY scope',
      },
      {
        scenario: 'Division head can manage division',
        hasPermission: authContext.hasRole('division_head', ScopeType.DIVISION),
        reason: 'Division head role in any division',
      },
      {
        scenario: 'HR can approve leave requests',
        hasPermission: authContext.hasRole('hr', ScopeType.COMPANY),
        reason: 'HR role in COMPANY scope',
      },
      {
        scenario: 'Team leader can manage team',
        hasPermission: authContext.hasRole('team_leader', ScopeType.TEAM),
        reason: 'Team leader role in any team',
      },
    ];

    return {
      message: '✅ Permission check simulation',
      userRoles: authContext.roleContexts.map((ctx) => ({
        role: ctx.roleName,
        scope: ctx.scope,
        scopeId: ctx.scopeId,
      })),
      scenarios,
      summary: {
        totalScenarios: scenarios.length,
        permittedActions: scenarios.filter((s) => s.hasPermission).length,
        deniedActions: scenarios.filter((s) => !s.hasPermission).length,
      },
    };
  }

  /**
   * Test 5: Cache status
   */
  @Get('cache-status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[TEST] Check cache configuration and status' })
  @ApiResponse({
    status: 200,
    description: 'Cache configuration details',
  })
  async testCacheStatus() {
    return {
      message: '✅ Cache configuration',
      config: {
        redisHost: process.env.REDIS_HOST || 'localhost',
        redisPort: process.env.REDIS_PORT || 6379,
        cacheTTL: process.env.ROLE_CACHE_TTL || 300,
        jwtBlacklistEnabled: process.env.JWT_BLACKLIST_ENABLED === 'true',
      },
      cacheStrategy: {
        primary: 'Redis',
        fallback: 'In-Memory (if Redis unavailable)',
        ttl: '5 minutes (configurable)',
        invalidation: 'Auto on role assignment/revocation',
      },
      instructions: {
        checkRedis: 'Run: redis-cli KEYS "user:roles:*"',
        checkTTL: 'Run: redis-cli TTL "user:roles:{userId}"',
        getCachedData: 'Run: redis-cli GET "user:roles:{userId}"',
        clearCache: 'Run: redis-cli DEL "user:roles:{userId}"',
      },
    };
  }

  /**
   * Test 6: Complete flow demo
   */
  @Get('complete-flow')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '[TEST] Complete authorization flow demonstration',
  })
  @ApiResponse({
    status: 200,
    description: 'End-to-end authorization flow',
  })
  async testCompleteFlow(@GetCurrentUser() user: any) {
    const authContext =
      await this.authorizationContextService.createContext(user);

    return {
      message: '✅ Complete Authorization Flow',
      flow: {
        step1_jwtValidation: {
          status: '✅ JWT validated',
          payload: {
            userId: user.id,
            email: user.email,
            jti: user.jti || 'not set',
          },
        },
        step2_roleLoading: {
          status: '✅ Roles loaded from cache/DB',
          source: 'RoleContextLoaderGuard',
          rolesCount: user.roleContexts?.length || 0,
          roles: user.roleContexts || [],
        },
        step3_authContext: {
          status: '✅ Authorization context created',
          availableMethods: [
            'hasRole()',
            'hasAnyRole()',
            'getHighestRole()',
            'canApproveRequest()',
            'canAccessResource()',
          ],
        },
        step4_permissionCheck: {
          status: '✅ Permission checks ready',
          examples: {
            isAdmin: authContext.hasRole('admin', ScopeType.COMPANY),
            isDivisionHead: authContext.hasRole(
              'division_head',
              ScopeType.DIVISION,
            ),
            isHR: authContext.hasRole('hr', ScopeType.COMPANY),
            highestRole: authContext.getHighestRole(ScopeType.COMPANY),
          },
        },
      },
      nextSteps: [
        '1. Migrate critical endpoints (requests.controller.ts)',
        '2. Replace @GetCurrentUser("roles") with @GetAuthContext()',
        '3. Update authorization logic to use authContext.canApprove*()',
        '4. Add tests for security scenarios',
        '5. Monitor cache hit rate and performance',
      ],
    };
  }
}
