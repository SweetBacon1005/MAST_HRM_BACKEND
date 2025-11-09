import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { RoleAssignmentService } from '../services/role-assignment.service';
import {
  DIVISION_ROLES_KEY,
  DIVISION_ACCESS_KEY,
  TEAM_LEADER_KEY,
} from '../decorators/division-roles.decorator';
import { ScopeType } from '@prisma/client';

@Injectable()
export class DivisionRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private roleAssignmentService: RoleAssignmentService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const requiredDivisionRoles = this.reflector.getAllAndOverride<string[]>(
      DIVISION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const divisionAccess = this.reflector.getAllAndOverride<{
      divisionId: number;
      roles: string[];
    }>(DIVISION_ACCESS_KEY, [context.getHandler(), context.getClass()]);

    const requireTeamLeader = this.reflector.getAllAndOverride<boolean>(
      TEAM_LEADER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredDivisionRoles) {
      const divisionRoles = await this.roleAssignmentService.getUserRolesByScope(user.id, ScopeType.DIVISION);
      const hasRequiredRole = divisionRoles.some(role => 
        requiredDivisionRoles.includes(role.name)
      );

      if (!hasRequiredRole) {
        throw new ForbiddenException(
          'Bạn không có quyền truy cập vào tính năng này trong phòng ban',
        );
      }
    }

    if (divisionAccess) {
      const { divisionId, roles } = divisionAccess;
      const divisionRoles = await this.roleAssignmentService.getUserRolesByScope(user.id, ScopeType.DIVISION, divisionId);
      const hasAccessToDivision = divisionRoles.some(role => 
        roles.includes(role.name)
      );

      if (!hasAccessToDivision) {
        throw new ForbiddenException(
          'Bạn không có quyền truy cập vào phòng ban này',
        );
      }
    }

    // Kiểm tra RequireTeamLeader
    if (requireTeamLeader) {
      const isTeamLeader = await this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: user.id,
          role: {
            name: 'team_leader',
            deleted_at: null
          },
          scope_type: 'TEAM',
          deleted_at: null,
        },
      });

      if (!isTeamLeader) {
        throw new ForbiddenException(
          'Chỉ team leader mới có quyền thực hiện hành động này',
        );
      }
    }

    return true;
  }
}
