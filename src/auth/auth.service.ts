import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokensDto } from './dto/tokens.dto';
// import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { OtpService } from './services/otp.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    // Kiểm tra user có bị xóa không (soft delete)
    if (user.deleted_at) {
      return null;
    }

    // Kiểm tra mật khẩu
    if (user.password && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<TokensDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const tokens = await this.getTokens(Number(user.id), user.email);
    return tokens;
  }

  async register(registerDto: RegisterDto): Promise<TokensDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email đã tồn tại');
    }

    // Kiểm tra độ mạnh mật khẩu
    if (registerDto.password.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }

    // Validate email format (đã được validate trong DTO)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerDto.email)) {
      throw new BadRequestException('Email không hợp lệ');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const tokens = await this.getTokens(Number(user.id), user.email);
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

      // Lấy userId từ payload thay vì từ DTO
      const userId = payload.sub;
      if (!userId) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const user = await this.usersService.findById(Number(userId));
      if (!user) {
        throw new UnauthorizedException('User không tồn tại');
      }

      const tokens = await this.getTokens(Number(user.id), user.email);
      return tokens;
    } catch (_error) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async logOut(userId: number) {
    return 'Log out thành công';
  }

  async getProfile(userId: number): Promise<any> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User không tồn tại');
    }

    // Lấy thông tin bổ sung
    const additionalInfo = await this.getUserAdditionalInfo(userId);

    const { password: _, ...result } = user;
    return {
      ...result,
      ...additionalInfo,
    };
  }

  private async getUserAdditionalInfo(userId: number): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Lấy thời gian gia nhập công ty từ contract đầu tiên
    const firstContract = await this.prisma.contracts.findFirst({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      orderBy: {
        start_date: 'asc',
      },
      select: {
        start_date: true,
      },
    });

    // Lấy thông tin chấm công hôm nay
    const todayTimesheet = await this.prisma.time_sheets.findFirst({
      where: {
        user_id: userId,
        work_date: {
          gte: today,
          lt: tomorrow,
        },
        deleted_at: null,
      },
      select: {
        checkin: true,
        checkout: true,
        total_work_time: true,
        status: true,
      },
    });

    // Lấy số giờ phép còn lại trong tháng hiện tại
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Tính tổng số ngày phép đã sử dụng trong tháng
    const usedLeaveDays = await this.prisma.day_offs.aggregate({
      where: {
        user_id: userId,
        start_date: {
          gte: currentMonth,
          lt: nextMonth,
        },
        status: 'APPROVED',
        type: 'PAID',
        deleted_at: null,
      },
      _sum: {
        total: true,
      },
    });

    // Giả sử mỗi tháng có 2.5 ngày phép (có thể config)
    const monthlyLeaveQuota = 2.5;
    const usedLeave = usedLeaveDays._sum.total || 0;
    const remainingLeave = Math.max(0, monthlyLeaveQuota - usedLeave);

    // Lấy danh sách thiết bị được cấp (tạm thời trả về mock data)
    const assignedDevices = await this.getUserAssignedDevices(userId);

    return {
      join_date: firstContract?.start_date || null,
      today_attendance: {
        checkin: todayTimesheet?.checkin || null,
        checkout: todayTimesheet?.checkout || null,
        total_work_time: todayTimesheet?.total_work_time || 0,
        status: todayTimesheet?.status || null,
      },
      remaining_leave_days: remainingLeave,
      assigned_devices: assignedDevices,
    };
  }

  private async getUserAssignedDevices(userId: number): Promise<any[]> {
    const devices = await this.prisma.user_devices.findMany({
      where: {
        user_id: userId,
        status: 'ACTIVE',
        deleted_at: null,
      },
      select: {
        id: true,
        device_name: true,
        device_type: true,
        device_serial: true,
        assigned_date: true,
        notes: true,
      },
      orderBy: {
        assigned_date: 'desc',
      },
    });

    return devices.map((device) => ({
      id: device.id,
      name: device.device_name,
      type: device.device_type.toLowerCase(),
      serial: device.device_serial,
      assigned_date: device.assigned_date,
      notes: device.notes,
    }));
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Kiểm tra email có tồn tại không
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Không trả về lỗi để tránh email enumeration attack
      return {
        message: 'Nếu email tồn tại, mã OTP đã được gửi đến email của bạn',
      };
    }

    // Kiểm tra user có bị xóa không
    if (user.deleted_at) {
      return {
        message: 'Nếu email tồn tại, mã OTP đã được gửi đến email của bạn',
      };
    }

    // Kiểm tra rate limit
    const canSendOTP = await this.otpService.checkOTPRateLimit(
      email,
      OtpType.PASSWORD_RESET,
    );
    if (!canSendOTP) {
      throw new BadRequestException(
        'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ.',
      );
    }

    // Tạo và gửi OTP
    await this.otpService.generateAndSendOTP(email, OtpType.PASSWORD_RESET);

    return {
      message: 'Nếu email tồn tại, mã OTP đã được gửi đến email của bạn',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { email, otp, newPassword } = resetPasswordDto;

    // Kiểm tra email có tồn tại không
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống');
    }

    // Kiểm tra user có bị xóa không
    if (user.deleted_at) {
      throw new NotFoundException('Tài khoản đã bị xóa');
    }

    // Validate mật khẩu mới
    if (newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }

    // Xác thực OTP
    const isValidOTP = await this.otpService.verifyOTP(
      email,
      otp,
      OtpType.PASSWORD_RESET,
    );
    if (!isValidOTP) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    await this.usersService.updatePassword(user.id, hashedPassword);

    // Cleanup tất cả OTP của user này sau khi reset thành công
    await this.otpService.cleanupExpiredOTPs(email, OtpType.PASSWORD_RESET);

    return { message: 'Đặt lại mật khẩu thành công' };
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Lấy thông tin user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    // Kiểm tra user có bị xóa không
    if (user.deleted_at) {
      throw new NotFoundException('Tài khoản đã bị xóa');
    }

    // Kiểm tra mật khẩu hiện tại
    if (!user.password) {
      throw new BadRequestException('Tài khoản chưa có mật khẩu');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    // Validate mật khẩu mới
    if (newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự');
    }

    // Kiểm tra mật khẩu mới có khác mật khẩu hiện tại không
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    // Mã hóa mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    await this.usersService.updatePassword(userId, hashedNewPassword);

    return { message: 'Thay đổi mật khẩu thành công' };
  }

  async sendChangePasswordOTP(email: string): Promise<{ message: string }> {
    // Kiểm tra email có tồn tại không
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Không trả về lỗi để tránh email enumeration attack
      return {
        message: 'Nếu email tồn tại, mã OTP đã được gửi đến email của bạn',
      };
    }

    // Kiểm tra user có bị xóa không
    if (user.deleted_at) {
      return {
        message: 'Nếu email tồn tại, mã OTP đã được gửi đến email của bạn',
      };
    }

    // Kiểm tra rate limit
    const canSendOTP = await this.otpService.checkOTPRateLimit(
      email,
      OtpType.CHANGE_PASSWORD,
    );
    if (!canSendOTP) {
      throw new BadRequestException(
        'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ.',
      );
    }

    // Tạo và gửi OTP
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
    // Kiểm tra email có tồn tại không
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống');
    }

    // Kiểm tra user có bị xóa không
    if (user.deleted_at) {
      throw new NotFoundException('Tài khoản đã bị xóa');
    }

    // Validate mật khẩu mới
    if (newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự');
    }

    // Xác thực OTP
    const isValidOTP = await this.otpService.verifyOTP(
      email,
      otp,
      OtpType.CHANGE_PASSWORD,
    );
    if (!isValidOTP) {
      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    await this.usersService.updatePassword(user.id, hashedPassword);

    // Cleanup tất cả OTP của user này sau khi change thành công
    await this.otpService.cleanupExpiredOTPs(email, OtpType.CHANGE_PASSWORD);

    return { message: 'Thay đổi mật khẩu thành công' };
  }

  private async getTokens(userId: number, email: string): Promise<TokensDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
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
