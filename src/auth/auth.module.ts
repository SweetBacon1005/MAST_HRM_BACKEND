import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminController } from './controllers/admin.controller';
import { SystemAdminController } from './controllers/system-admin.controller';
import { RoleAssignmentController } from './controllers/role-assignment.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { OtpService } from './services/otp.service';
import { RoleAssignmentService } from './services/role-assignment.service';
import { EmailService } from '../common/services/email.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PrismaService } from 'src/database/prisma.service';
import { DivisionRolesGuard } from './guards/division-roles.guard';
import { EnhancedRolesGuard } from './guards/enhanced-roles.guard';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    NotificationsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthController,
    AdminController,
    SystemAdminController,
    RoleAssignmentController,
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    JwtRefreshStrategy,
    OtpService,
    RoleAssignmentService,
    EmailService,
    ActivityLogService,
    PrismaService,
    DivisionRolesGuard,
    EnhancedRolesGuard,
  ],
  exports: [AuthService, RoleAssignmentService, DivisionRolesGuard, EnhancedRolesGuard],
})
export class AuthModule {}
