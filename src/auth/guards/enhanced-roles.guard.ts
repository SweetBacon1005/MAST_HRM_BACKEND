import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionService } from '../services/permission.service';
import { PrismaService } from '../../database/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Lấy tất cả decorators
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

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

    // Nếu không có decorator nào thì cho phép truy cập
    if (
      !requiredRoles &&
      !requiredDivisionRoles &&
      !divisionAccess &&
      !requireTeamLeader
    ) {
      return true;
    }

    // Kiểm tra system roles trước
    if (requiredRoles) {
      const hasSystemRole = await this.checkSystemRoles(user.id, requiredRoles);
      if (hasSystemRole) {
        return true; // System role có ưu tiên cao nhất
      }
    }

    // Kiểm tra division roles
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
      const { divisionId, roles } = divisionAccess;
      const hasAccessToDivision = await this.checkDivisionAccess(
        user.id,
        divisionId,
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
    userId: number,
    requiredRoles: string[],
  ): Promise<boolean> {
    const userInfo = await this.prisma.user_information.findFirst({
      where: { user_id: userId },
      include: {
        role: true,
      },
    });

    return (
      (userInfo?.role && requiredRoles.includes(userInfo.role.name)) || false
    );
  }

  private async checkDivisionRoles(
    userId: number,
    requiredRoles: string[],
  ): Promise<boolean> {
    const userDivisions = await this.prisma.user_division.findMany({
      where: {
        userId,
      },
      include: {
        role: true,
      },
    });

    return userDivisions.some(
      (userDiv) => userDiv.role && requiredRoles.includes(userDiv.role.name),
    );
  }

  private async checkDivisionAccess(
    userId: number,
    divisionId: number,
    roles: string[],
  ): Promise<boolean> {
    const userDivision = await this.prisma.user_division.findFirst({
      where: {
        userId,
        divisionId,
      },
      include: {
        role: true,
      },
    });

    return (
      (userDivision?.role && roles.includes(userDivision.role.name)) || false
    );
  }

  private async checkTeamLeader(userId: number): Promise<boolean> {
    // Kiểm tra user có phải là team leader không thông qua bảng teams
    const teamLeaderRecord = await this.prisma.teams.findFirst({
      where: {
        leader_id: userId,
        deleted_at: null,
      },
    });

    return !!teamLeaderRecord;
  }
}
