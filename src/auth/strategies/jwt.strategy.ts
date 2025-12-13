import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

/**
 * JWT Strategy - Minimal & Stateless
 * 
 * Changes from old implementation:
 * - Không load roles từ DB (moved to RoleContextLoaderGuard)
 * - JWT payload chỉ chứa user ID, email, và JTI
 * - Role contexts sẽ được load từ cache/DB bởi RoleContextLoaderGuard
 * 
 * Benefits:
 * - JWT token nhỏ gọn (~500 bytes)
 * - Không có stale data issue
 * - Có thể revoke bằng JTI blacklist
 * - Better separation of concerns
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: any) {
    // Validate user exists
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    // Return minimal user info
    // Role contexts sẽ được load sau bởi RoleContextLoaderGuard
    return {
      id: payload.sub,
      email: payload.email,
      jti: payload.jti, // JWT ID for blacklist capability
    };
  }
}
