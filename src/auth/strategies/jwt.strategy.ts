import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { getRoleLevel } from '../constants/role.constants';
import { RoleAssignmentService } from '../services/role-assignment.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private roleAssignmentService: RoleAssignmentService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    try {
      const userRoles = await this.roleAssignmentService.getUserRoles(
        payload.sub,
      );
      const role_names = userRoles.roles.map((role) => role.name);

      const sortedRoles = role_names.sort(
        (a, b) => getRoleLevel(b) - getRoleLevel(a),
      );

      return {
        id: payload.sub,
        email: payload.email,
        roles: sortedRoles,
      };
    } catch (error) {
      return {
        id: payload.sub,
        email: payload.email,
        roles: [],
      };
    }
  }
}
