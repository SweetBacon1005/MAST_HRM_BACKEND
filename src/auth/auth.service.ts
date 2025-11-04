import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OtpType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  ASSET_STATUSES,
  DEVICE_CATEGORIES,
} from '../assets/constants/asset.constants';
import {
  AUTH_ERRORS,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import { ActivityLogService } from '../common/services/activity-log.service';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
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

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokensDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    const tokens = await this.getTokens(
      Number(user.id),
      user.email,
      user.user_information?.role?.name || '',
    );

    await this.activityLogService.logUserLogin(
      Number(user.id),
      ipAddress,
      userAgent,
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

  async register(registerDto: RegisterDto): Promise<TokensDto> {
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
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    await this.activityLogService.logCrudOperation(
      'User',
      Number(user.id),
      'created',
      Number(user.id),
      {
        email: user.email,
        registration_method: 'self_register',
      },
    );

    const tokens = await this.getTokens(
      Number(user.id),
      user.email,
      registerDto.role,
    );
    return tokens;
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<TokensDto> {
    try {
      const payload = await this.jwtService.verify(
        refreshTokenDto.refresh_token,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const userId = payload.sub;
      if (!userId) {
        throw new UnauthorizedException(AUTH_ERRORS.INVALID_REFRESH_TOKEN);
      }

      const user = await this.usersService.findById(Number(userId));
      if (!user || user.deleted_at) {
        throw new UnauthorizedException(USER_ERRORS.USER_NOT_FOUND);
      }

      const tokens = await this.getTokens(
        Number(user.id),
        user.email,
        user?.user_information?.role?.name || '',
      );
      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(AUTH_ERRORS.INVALID_REFRESH_TOKEN);
    }
  }

  async logOut(_userId: number): Promise<{ message: string }> {
    return { message: AUTH_ERRORS.LOGOUT_SUCCESS };
  }

  async getProfile(userId: number): Promise<any> {
    const user = await this.usersService.findById(userId);
    if (!user || user.deleted_at) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    try {
      const additionalInfo = await this.getUserAdditionalInfo(userId);

      const { password: _, ...result } = user;
      return {
        ...result,
        ...additionalInfo,
      };
    } catch (error) {
      console.error('Error getting additional user info:', error);

      const { password: _, ...result } = user;
      return {
        ...result,  
        join_date: user.created_at,
        today_attendance: {
          checkin: null,
          checkout: null,
          total_work_time: 0,
          status: 'PENDING',
          late_time: 0,
          early_time: 0,
          is_complete: false,
          has_attendance: false,
        },
        remaining_leave_days: 0,
        annual_leave_quota: 12,
        used_leave_days: 0,
        assigned_devices: [],
        organization: {
          position_id: user.user_information?.position_id,
          level_id: user.user_information?.level_id,
          role_id: user.user_information?.role_id,
          division_id: user.user_division?.[0]?.division?.id || null,
        },
      };
    }
  }

  private async getUserAdditionalInfo(userId: number): Promise<any> {
    const today = new Date();
    const todayStart = new Date(
      today.toISOString().split('T')[0] + 'T00:00:00.000Z',
    );
    const todayEnd = new Date(
      today.toISOString().split('T')[0] + 'T23:59:59.999Z',
    );

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(
      currentYear,
      currentMonth + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const [
      userInfo,
      todayTimesheet,
      usedLeaveDays,
      assignedDevices,
      userDivision,
    ] = await Promise.all([
      this.prisma.user_information.findFirst({
        where: {
          user_id: userId,
          deleted_at: null,
        },
        select: {
          position_id: true,
          level_id: true,
          role_id: true,
          user: {
            select: {
              created_at: true,
            },
          },
        },
      }),

      this.prisma.time_sheets.findFirst({
        where: {
          user_id: userId,
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
          status: true,
          late_time: true,
          early_time: true,
          is_complete: true,
        },
      }),

      this.prisma.day_offs.aggregate({
        where: {
          user_id: userId,
          work_date: {
            gte: monthStart,
            lte: monthEnd,
          },
          status: 'APPROVED',
          type: 'PAID',
          deleted_at: null,
        },
        _count: {
          id: true,
        },
      }),

      this.prisma.assets.findMany({
        where: {
          assigned_to: userId,
          status: ASSET_STATUSES.ASSIGNED,
          deleted_at: null,
          category: { in: DEVICE_CATEGORIES as any },
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

      this.prisma.user_division.findFirst({
        where: {
          userId: userId,
        },
        select: {
          divisionId: true,
          teamId: true,
          role_id: true,
        },
      }),
    ]);

    const annualLeaveQuota = 12;
    const monthlyLeaveQuota = annualLeaveQuota / 12;
    const usedLeave = usedLeaveDays._count.id || 0;
    const remainingLeave = Math.max(0, monthlyLeaveQuota - usedLeave);

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

    const unreadNotifications = await this.prisma.user_notifications.count({
      where: {
        user_id: userId,
        is_read: false,
        deleted_at: null,
      },
    });

    return {
      join_date: userInfo?.user?.created_at.toISOString().split('T')[0],
      today_attendance: {
        checkin: todayTimesheet?.checkin || null,
        checkout: todayTimesheet?.checkout || null,
        total_work_time: todayTimesheet?.total_work_time || 0,
        status: todayTimesheet?.status || 'PENDING',
        late_time: todayTimesheet?.late_time || 0,
        early_time: todayTimesheet?.early_time || 0,
        is_complete: todayTimesheet?.is_complete || false,
        has_attendance: !!todayTimesheet,
      },
      remaining_leave_days: Math.round(remainingLeave * 10) / 10,
      annual_leave_quota: annualLeaveQuota,
      used_leave_days: usedLeave,
      assigned_devices: formattedDevices,
      organization: {
        position_id: userInfo?.position_id || null,
        level_id: userInfo?.level_id || null,
        role_id: userInfo?.role_id || null,
        division_id: userDivision?.divisionId || null,
        team_id: userDivision?.teamId || null,
      },
      unread_notifications: unreadNotifications,
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
    const { email, otp, newPassword } = resetPasswordDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(AUTH_ERRORS.EMAIL_NOT_FOUND);
    }

    if (user.deleted_at) {
      throw new NotFoundException(AUTH_ERRORS.ACCOUNT_DELETED);
    }

    this.validatePasswordStrength(newPassword);

    const isValidOTP = await this.otpService.verifyOTP(
      email,
      otp,
      OtpType.PASSWORD_RESET,
    );
    if (!isValidOTP) {
      throw new BadRequestException(AUTH_ERRORS.OTP_INVALID_OR_EXPIRED);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.usersService.updatePassword(user.id, hashedPassword);

    await this.otpService.cleanupExpiredOTPs(email, OtpType.PASSWORD_RESET);

    return { message: AUTH_ERRORS.PASSWORD_RESET_SUCCESS };
  }

  async verifyOTP(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{ message: string; isValid: boolean; resetToken?: string }> {
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

    const resetToken = this.jwtService.sign(
      {
        email,
        purpose: 'password_reset',
        userId: user.id,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    return {
      message: AUTH_ERRORS.OTP_VALID,
      isValid: true,
      resetToken,
    };
  }

  async resetPasswordWithToken(
    resetPasswordWithTokenDto: ResetPasswordWithTokenDto,
  ): Promise<{ message: string }> {
    const { email, resetToken, newPassword } = resetPasswordWithTokenDto;

    try {
      const decoded = this.jwtService.verify(resetToken, {
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

      this.validatePasswordStrength(newPassword);

      const hashedPassword = await bcrypt.hash(newPassword, 12);

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
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    if (user.deleted_at) {
      throw new NotFoundException(AUTH_ERRORS.ACCOUNT_DELETED);
    }

    if (!user.password) {
      throw new BadRequestException(AUTH_ERRORS.ACCOUNT_NO_PASSWORD);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException(AUTH_ERRORS.CURRENT_PASSWORD_INCORRECT);
    }

    this.validatePasswordStrength(newPassword);

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(AUTH_ERRORS.NEW_PASSWORD_SAME_AS_CURRENT);
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await this.usersService.updatePassword(userId, hashedNewPassword);

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
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(AUTH_ERRORS.EMAIL_NOT_FOUND);
    }

    if (user.deleted_at) {
      throw new NotFoundException(AUTH_ERRORS.ACCOUNT_DELETED);
    }

    this.validatePasswordStrength(newPassword);

    const isValidOTP = await this.otpService.verifyOTP(
      email,
      otp,
      OtpType.CHANGE_PASSWORD,
    );
    if (!isValidOTP) {
      throw new BadRequestException(AUTH_ERRORS.OTP_INVALID_OR_EXPIRED);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.usersService.updatePassword(user.id, hashedPassword);

    await this.otpService.cleanupExpiredOTPs(email, OtpType.CHANGE_PASSWORD);

    return { message: AUTH_ERRORS.PASSWORD_CHANGE_SUCCESS };
  }

  private async getTokens(
    userId: number,
    email: string,
    role: string,
  ): Promise<TokensDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
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
