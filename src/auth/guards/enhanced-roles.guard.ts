import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { PrismaService } from '../../database/prisma.service';
import { RoleAssignmentService } from '../services/role-assignment.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ScopeType } from '@prisma/client';
import {
  DIVISION_ROLES_KEY,
  DIVISION_ACCESS_KEY,
  TEAM_LEADER_KEY,
} from '../decorators/division-roles.decorator';

@Injectable()
export class EnhancedRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
    private prisma: PrismaService,
    private roleAssignmentService: RoleAssignmentService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredDivisionRoles = this.reflector.getAllAndOverride<string[]>(
      DIVISION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const divisionAccess = this.reflector.getAllAndOverride<{
      division_id: number;
      roles: string[];
    }>(DIVISION_ACCESS_KEY, [context.getHandler(), context.getClass()]);

    const requireTeamLeader = this.reflector.getAllAndOverride<boolean>(
      TEAM_LEADER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      !requiredRoles &&
      !requiredDivisionRoles &&
      !divisionAccess &&
      !requireTeamLeader
    ) {
      return true;
    }

    if (requiredRoles) {
      const hasSystemRole = await this.checkSystemRoles(user.id, requiredRoles);
      if (hasSystemRole) {
        return true; 
      }
    }

    if (requiredDivisionRoles) {
      const hasDivisionRole = await this.checkDivisionRoles(
        user.id,
        requiredDivisionRoles,
      );
      if (hasDivisionRole) {
        return true;
      }
    }

    // Kiểm tra division access cụ thể
    if (divisionAccess) {
      const { division_id, roles } = divisionAccess;
      const hasAccessToDivision = await this.checkDivisionAccess(
        user.id,
        division_id,
        roles,
      );
      if (hasAccessToDivision) {
        return true;
      }
    }

    // Kiểm tra team leader
    if (requireTeamLeader) {
      const isTeamLeader = await this.checkTeamLeader(user.id);
      if (isTeamLeader) {
        return true;
      }
    }

    // Nếu có bất kỳ decorator nào nhưng không thỏa mãn
    if (
      requiredRoles ||
      requiredDivisionRoles ||
      divisionAccess ||
      requireTeamLeader
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập vào tính năng này',
      );
    }

    return true;
  }

  private async checkSystemRoles(
    user_id: number,
    requiredRoles: string[],
  ): Promise<boolean> {
    const companyRoles = await this.roleAssignmentService.getUserRolesByScope(user_id, ScopeType.COMPANY);
    
    return companyRoles.some(role => requiredRoles.includes(role.name));
  }

  private async checkDivisionRoles(
    user_id: number,
    requiredRoles: string[],
  ): Promise<boolean> {
    const divisionRoles = await this.roleAssignmentService.getUserRolesByScope(user_id, ScopeType.DIVISION);
    
    return divisionRoles.some(role => requiredRoles.includes(role.name));
  }

  private async checkDivisionAccess(
    user_id: number,
    division_id: number,
    roles: string[],
  ): Promise<boolean> {
    const divisionRoles = await this.roleAssignmentService.getUserRolesByScope(user_id, ScopeType.DIVISION, division_id);
    
    return divisionRoles.some(role => roles.includes(role.name));
  }

  private async checkTeamLeader(user_id: number): Promise<boolean> {
    const teamLeaderRecord = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: user_id,
        role: {
          name: 'team_leader',
          deleted_at: null
        },
        scope_type: 'TEAM',
        deleted_at: null,
      },
    });

    return !!teamLeaderRecord;
  }
}
