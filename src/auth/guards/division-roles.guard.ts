import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import {
  DIVISION_ROLES_KEY,
  DIVISION_ACCESS_KEY,
  TEAM_LEADER_KEY,
} from '../decorators/division-roles.decorator';

@Injectable()
export class DivisionRolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Kiểm tra DivisionRoles decorator
    const requiredDivisionRoles = this.reflector.getAllAndOverride<string[]>(
      DIVISION_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Kiểm tra DivisionAccess decorator
    const divisionAccess = this.reflector.getAllAndOverride<{
      divisionId: number;
      roles: string[];
    }>(DIVISION_ACCESS_KEY, [context.getHandler(), context.getClass()]);

    // Kiểm tra RequireTeamLeader decorator
    const requireTeamLeader = this.reflector.getAllAndOverride<boolean>(
      TEAM_LEADER_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Lấy thông tin user divisions và roles
    const userDivisions = await this.prisma.user_division.findMany({
      where: {
        userId: user.id,
      },
      include: {
        role: true,
        division: true,
      },
    });

    // Kiểm tra DivisionRoles
    if (requiredDivisionRoles) {
      const hasRequiredRole = userDivisions.some((userDiv) =>
        requiredDivisionRoles.includes(userDiv.role?.name || ''),
      );

      if (!hasRequiredRole) {
        throw new ForbiddenException(
          'Bạn không có quyền truy cập vào tính năng này trong phòng ban',
        );
      }
    }

    // Kiểm tra DivisionAccess
    if (divisionAccess) {
      const { divisionId, roles } = divisionAccess;
      const hasAccessToDivision = userDivisions.some(
        (userDiv) =>
          userDiv.divisionId === divisionId &&
          roles.includes(userDiv.role?.name || ''),
      );

      if (!hasAccessToDivision) {
        throw new ForbiddenException(
          'Bạn không có quyền truy cập vào phòng ban này',
        );
      }
    }

    // Kiểm tra RequireTeamLeader
    if (requireTeamLeader) {
      // Kiểm tra user có phải là team leader không thông qua bảng teams
      const isTeamLeader = await this.prisma.teams.findFirst({
        where: {
          leader_id: user.id,
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
