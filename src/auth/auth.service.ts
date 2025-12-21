import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AssetStatus, OtpType, ScopeType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  AUTH_ERRORS,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { ROLE_NAMES } from './constants/role.constants';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordWithTokenDto } from './dto/reset-password-with-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokensDto } from './dto/tokens.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './services/otp.service';
import { RoleAssignmentService } from './services/role-assignment.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private prisma: PrismaService,
    private roleAssignmentService: RoleAssignmentService,
    private notificationsService: NotificationsService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    if (user.deleted_at) {
      return null;
    }

    if (user.password && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<TokensDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    const tokens = await this.getTokens(
      Number(user.id),
      user.email,
      Array.from(new Set(user.user_role_assignments.map((assignment) => assignment.role.name))),
    );

    return tokens;
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException(AUTH_ERRORS.PASSWORD_TOO_SHORT);
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new BadRequestException(AUTH_ERRORS.PASSWORD_WEAK);
    }

    const dangerousChars = /[<>'"&]/;
    if (dangerousChars.test(password)) {
      throw new BadRequestException(AUTH_ERRORS.PASSWORD_INVALID_CHARS);
    }
  }

  async register(registerDto: RegisterDto, user_id: number): Promise<TokensDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException(AUTH_ERRORS.EMAIL_ALREADY_EXISTS);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerDto.email)) {
      throw new BadRequestException(AUTH_ERRORS.INVALID_EMAIL_FORMAT);
    }

    this.validatePasswordStrength(registerDto.password);

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.usersService.create(
      {
        ...registerDto,
        password: hashedPassword,
      },
      user_id,
    );

    const role = await this.prisma.roles.findFirst({
      where: { name: { equals: ROLE_NAMES.EMPLOYEE }, deleted_at: null },
    });

    if (!role) {
      throw new BadRequestException(AUTH_ERRORS.ROLE_NOT_FOUND);
    }

    await this.roleAssignmentService.assignRole({
      user_id: user.id,
      role_id: role.id,
      scope_type: ScopeType.COMPANY,
      assigned_by: user.id,
    });

    const tokens = await this.getTokens(Number(user.id), user.email, [
      ROLE_NAMES.EMPLOYEE,
    ]);
    return tokens;
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<TokensDto> {
    const payload = await this.jwtService.verify(
      refreshTokenDto.refresh_token,
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      },
    );

    const user_id = payload.sub;
    if (!user_id) {
      throw new UnauthorizedException(AUTH_ERRORS.INVALID_REFRESH_TOKEN);
    }

    const user = await this.usersService.findById(Number(user_id));
    if (!user || user.deleted_at) {
      throw new UnauthorizedException(USER_ERRORS.USER_NOT_FOUND);
    }

    const userRoles = await this.roleAssignmentService.getUserRoles(user.id);

    const tokens = await this.getTokens(
      Number(user.id),
      user.email,
      Array.from(new Set(userRoles.roles.map((role) => role.name))),
    );
    return tokens;
  }

  async logOut(_user_id: number): Promise<{ message: string }> {
    return { message: AUTH_ERRORS.LOGOUT_SUCCESS };
  }

  async getProfile(user_id: number): Promise<any> {
    const user = await this.usersService.findById(user_id);
    if (!user || user.deleted_at) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    try {
      const additionalInfo = await this.getUserAdditionalInfo(user_id);

      const { password: _, user_division: _user_division, ...result } = user;
      return {
        ...result,
        ...additionalInfo,
      };
    } catch (error) {

      const { password: _, user_division: _user_division, ...result } = user;
      return {
        ...result,
        join_date: user.created_at,
        today_attendance: {
          checkin: null,
          checkout: null,
          total_work_time: 0,
          is_complete: false,
          has_attendance: false,
        },
        remaining_leave_days: 0,
        annual_leave_quota: 12,
        used_leave_days: 0,
        assigned_devices: [],
        organization: {
          division_id: null,
          team_id: null,
          division: null,
          team: null,
        },
        unread_notifications: 0,
        role_assignments: [],
      };
    }
  }

  private async getUserAdditionalInfo(user_id: number): Promise<any> {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const [
      userInfo,
      todayTimesheet,
      userLeaveBalance,
      assignedDevices,
      divisionAssignment,
      teamAssignment,
      unreadNotifications,
    ] = await Promise.all([
      this.prisma.users.findUnique({
        where: { id: user_id },
        select: {
          created_at: true,
          user_information: {
            select: {
              position_id: true,
            },
          },
        },
      }),

      this.prisma.time_sheets.findFirst({
        where: {
          user_id: user_id,
          work_date: {
            gte: todayStart,
            lte: todayEnd,
          },
          deleted_at: null,
        },
        select: {
          checkin: true,
          checkout: true,
          total_work_time: true,
          // REMOVED: late_time, early_time
          is_complete: true,
        },
      }),

      this.prisma.user_leave_balances.findFirst({
        where: {
          user_id: user_id,
          deleted_at: null,
        },
      }),

      this.prisma.assets.findMany({
        where: {
          assigned_to: user_id,
          status: AssetStatus.ASSIGNED,
          deleted_at: null,
        },
        select: {
          id: true,
          name: true,
          asset_code: true,
          category: true,
          brand: true,
          model: true,
          serial_number: true,
          assigned_date: true,
          notes: true,
        },
        orderBy: {
          assigned_date: 'desc',
        },
      }),

      this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: user_id,
          scope_type: 'DIVISION',
          deleted_at: null,
          scope_id: { not: null },
        },
        orderBy: { created_at: 'desc' },
        select: {
          scope_id: true,
        },
      }),
      this.prisma.user_role_assignment.findFirst({
        where: {
          user_id: user_id,
          scope_type: 'TEAM',
          deleted_at: null,
          scope_id: { not: null },
        },
        orderBy: { created_at: 'desc' },
        select: {
          scope_id: true,
        },
      }),

      this.prisma.user_notifications.count({
        where: {
          user_id: user_id,
          is_read: false,
          deleted_at: null,
        },
      }),
    ]);

    const formattedDevices = assignedDevices.map((asset) => ({
      id: asset.id,
      name: asset.name || 'Unknown Asset',
      type: asset.category?.toLowerCase() || 'unknown',
      code: asset.asset_code,
      brand: asset.brand,
      model: asset.model,
      serial: asset.serial_number || 'N/A',
      assigned_date: asset.assigned_date,
      notes: asset.notes || '',
    }));

    // Lấy role assignments của user
    const userRoles = await this.roleAssignmentService.getUserRoles(user_id);

    // Lấy division_head nếu user có division
    let divisionWithHead: any = null;
    if (divisionAssignment?.scope_id) {
      const division = await this.prisma.divisions.findUnique({
        where: { id: divisionAssignment.scope_id },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          type: true,
        },
      });

      let divisionHead: any = null;
      if (division) {
        const headAssignment = await this.prisma.user_role_assignment.findFirst({
          where: {
            scope_type: ScopeType.DIVISION,
            scope_id: division.id,
            deleted_at: null,
            role: {
              name: 'division_head',
              deleted_at: null,
            },
          },
          select: {
            user: {
              select: {
                id: true,
                email: true,
                user_information: {
                  select: {
                    name: true,
                    avatar: true,
                    phone: true,
          
                  },
                },
              },
            },
          },
        });

        if (headAssignment?.user) {
          divisionHead = {
            id: headAssignment.user.id,
            email: headAssignment.user.email,
            name: headAssignment.user.user_information?.name || null,
            avatar: headAssignment.user.user_information?.avatar || null,
            phone: headAssignment.user.user_information?.phone || null,
          };
        }

        divisionWithHead = {
          ...division,
          division_head: divisionHead,
        };
      }
    }

    // Lấy team info nếu user có team
    let teamInfo: any = null;
    if (teamAssignment?.scope_id) {
      teamInfo = await this.prisma.teams.findUnique({
        where: { id: teamAssignment.scope_id },
        select: {
          id: true,
          name: true,
          division_id: true,
          founding_date: true,
        },
      });
    }

    return {
      join_date: userInfo?.created_at.toISOString().split('T')[0],
      today_attendance: {
        checkin: todayTimesheet?.checkin || null,
        checkout: todayTimesheet?.checkout || null,
        total_work_time: todayTimesheet?.total_work_time || 0,
        // REMOVED: late_time, early_time fields, status field
        is_complete: todayTimesheet?.is_complete || false,
        has_attendance: !!todayTimesheet,
      },
      remaining_leave_days: (userLeaveBalance?.paid_leave_balance || 0) * 8,
      annual_leave_quota: (userLeaveBalance?.annual_paid_leave_quota || 0) * 8,
      used_leave_days: 1,
      assigned_devices: formattedDevices,
      organization: {
        division: divisionWithHead,
        team: teamInfo,
      },
      unread_notifications: unreadNotifications,
      role_assignments: userRoles.roles,
    };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return {
        message: AUTH_ERRORS.OTP_SENT_IF_EMAIL_EXISTS,
      };
    }

    if (user.deleted_at) {
      return {
        message: AUTH_ERRORS.OTP_SENT_IF_EMAIL_EXISTS,
      };
    }

    const canSendOTP = await this.otpService.checkOTPRateLimit(
      email,
      OtpType.PASSWORD_RESET,
    );
    if (!canSendOTP) {
      throw new BadRequestException(AUTH_ERRORS.TOO_MANY_REQUESTS);
    }

    await this.otpService.generateAndSendOTP(email, OtpType.PASSWORD_RESET);

    return {
      message: 'Nếu email tồn tại, mã OTP đã được gửi đến email của bạn',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { email, otp, new_password } = resetPasswordDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(AUTH_ERRORS.EMAIL_NOT_FOUND);
    }

    if (user.deleted_at) {
      throw new NotFoundException(AUTH_ERRORS.ACCOUNT_DELETED);
    }

    this.validatePasswordStrength(new_password);

    const isValidOTP = await this.otpService.verifyOTP(
      email,
      otp,
      OtpType.PASSWORD_RESET,
    );
    if (!isValidOTP) {
      throw new BadRequestException(AUTH_ERRORS.OTP_INVALID_OR_EXPIRED);
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);

    await this.usersService.updatePassword(user.id, hashedPassword);

    await this.otpService.cleanupExpiredOTPs(email, OtpType.PASSWORD_RESET);

    return { message: AUTH_ERRORS.PASSWORD_RESET_SUCCESS };
  }

  async verifyOTP(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{ message: string; isValid: boolean; reset_token?: string }> {
    const { email, otp } = verifyOtpDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(AUTH_ERRORS.EMAIL_NOT_FOUND);
    }

    if (user.deleted_at) {
      throw new NotFoundException(AUTH_ERRORS.ACCOUNT_DELETED);
    }

    const isValidOTP = await this.otpService.verifyOTP(
      email,
      otp,
      OtpType.PASSWORD_RESET,
    );

    if (!isValidOTP) {
      return {
        message: AUTH_ERRORS.OTP_INVALID_OR_EXPIRED,
        isValid: false,
      };
    }

    const reset_token = this.jwtService.sign(
      {
        email,
        purpose: 'password_reset',
        user_id: user.id,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    return {
      message: AUTH_ERRORS.OTP_VALID,
      isValid: true,
      reset_token,
    };
  }

  async resetPasswordWithToken(
    resetPasswordWithTokenDto: ResetPasswordWithTokenDto,
  ): Promise<{ message: string }> {
    const { email, reset_token, new_password } = resetPasswordWithTokenDto;

    try {
      const decoded = this.jwtService.verify(reset_token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      if (decoded.purpose !== 'password_reset' || decoded.email !== email) {
        throw new BadRequestException(AUTH_ERRORS.INVALID_TOKEN);
      }

      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new NotFoundException(AUTH_ERRORS.EMAIL_NOT_FOUND);
      }

      if (user.deleted_at) {
        throw new NotFoundException(AUTH_ERRORS.ACCOUNT_DELETED);
      }

      this.validatePasswordStrength(new_password);

      const hashedPassword = await bcrypt.hash(new_password, 12);

      await this.usersService.updatePassword(user.id, hashedPassword);

      await this.otpService.cleanupExpiredOTPs(email, OtpType.PASSWORD_RESET);

      return { message: AUTH_ERRORS.PASSWORD_RESET_SUCCESS };
    } catch (error) {
      if (
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        throw new BadRequestException(AUTH_ERRORS.TOKEN_INVALID_OR_EXPIRED);
      }
      throw error;
    }
  }

  async changePassword(
    user_id: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { current_password, new_password } = changePasswordDto;

    const user = await this.usersService.findById(user_id);
    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    if (user.deleted_at) {
      throw new NotFoundException(AUTH_ERRORS.ACCOUNT_DELETED);
    }

    if (!user.password) {
      throw new BadRequestException(AUTH_ERRORS.ACCOUNT_NO_PASSWORD);
    }

    const iscurrent_passwordValid = await bcrypt.compare(
      current_password,
      user.password,
    );
    if (!iscurrent_passwordValid) {
      throw new BadRequestException(AUTH_ERRORS.CURRENT_PASSWORD_INCORRECT);
    }

    this.validatePasswordStrength(new_password);

    const isSamePassword = await bcrypt.compare(new_password, user.password);
    if (isSamePassword) {
      throw new BadRequestException(AUTH_ERRORS.NEW_PASSWORD_SAME_AS_CURRENT);
    }

    const hashednew_password = await bcrypt.hash(new_password, 12);

    await this.usersService.updatePassword(user_id, hashednew_password);

    return { message: AUTH_ERRORS.PASSWORD_CHANGE_SUCCESS };
  }

  async sendChangePasswordOTP(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return {
        message: AUTH_ERRORS.OTP_SENT_IF_EMAIL_EXISTS,
      };
    }

    if (user.deleted_at) {
      return {
        message: AUTH_ERRORS.OTP_SENT_IF_EMAIL_EXISTS,
      };
    }

    const canSendOTP = await this.otpService.checkOTPRateLimit(
      email,
      OtpType.CHANGE_PASSWORD,
    );
    if (!canSendOTP) {
      throw new BadRequestException(AUTH_ERRORS.TOO_MANY_REQUESTS);
    }

    await this.otpService.generateAndSendOTP(email, OtpType.CHANGE_PASSWORD);

    return {
      message: 'Nếu email tồn tại, mã OTP đã được gửi đến email của bạn',
    };
  }

  async changePasswordWithOTP(
    email: string,
    otp: string,
    new_password: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(AUTH_ERRORS.EMAIL_NOT_FOUND);
    }

    if (user.deleted_at) {
      throw new NotFoundException(AUTH_ERRORS.ACCOUNT_DELETED);
    }

    this.validatePasswordStrength(new_password);

    const isValidOTP = await this.otpService.verifyOTP(
      email,
      otp,
      OtpType.CHANGE_PASSWORD,
    );
    if (!isValidOTP) {
      throw new BadRequestException(AUTH_ERRORS.OTP_INVALID_OR_EXPIRED);
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);

    await this.usersService.updatePassword(user.id, hashedPassword);

    await this.otpService.cleanupExpiredOTPs(email, OtpType.CHANGE_PASSWORD);

    return { message: AUTH_ERRORS.PASSWORD_CHANGE_SUCCESS };
  }

  private async getTokens(
    user_id: number,
    email: string,
    roles: string[],
  ): Promise<TokensDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user_id,
          email,
          roles,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user_id,
          email,
          roles,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
        },
      ),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
