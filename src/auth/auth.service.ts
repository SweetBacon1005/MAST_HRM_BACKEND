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

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 8 ký tự');
    }

    // Kiểm tra có ít nhất 1 chữ hoa, 1 chữ thường, 1 số
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new BadRequestException(
        'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số'
      );
    }

    // Kiểm tra không chứa ký tự đặc biệt nguy hiểm
    const dangerousChars = /[<>'"&]/;
    if (dangerousChars.test(password)) {
      throw new BadRequestException('Mật khẩu chứa ký tự không được phép');
    }
  }

  async register(registerDto: RegisterDto): Promise<TokensDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email đã tồn tại');
    }

    // Validate email format (đã được validate trong DTO)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerDto.email)) {
      throw new BadRequestException('Email không hợp lệ');
    }

    // Kiểm tra độ mạnh mật khẩu
    this.validatePasswordStrength(registerDto.password);

    const hashedPassword = await bcrypt.hash(registerDto.password, 12); // Tăng salt rounds
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
      if (!user || user.deleted_at) {
        throw new UnauthorizedException('User không tồn tại hoặc đã bị xóa');
      }

      const tokens = await this.getTokens(Number(user.id), user.email);
      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
  }

  async logOut(_userId: number): Promise<{ message: string }> {
    // TODO: Implement token blacklisting if needed
    // Có thể thêm logic để blacklist token hoặc invalidate session
    
    return { message: 'Đăng xuất thành công' };
  }

  async getProfile(userId: number): Promise<any> {
    const user = await this.usersService.findById(userId);
    if (!user || user.deleted_at) {
      throw new NotFoundException('User không tồn tại hoặc đã bị xóa');
    }

    try {
      // Lấy thông tin bổ sung
      const additionalInfo = await this.getUserAdditionalInfo(userId);

      const { password: _, ...result } = user;
      return {
        ...result,
        ...additionalInfo,
      };
    } catch (error) {
      // Log error nhưng vẫn trả về thông tin cơ bản
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
          position_id: null,
          level_id: null,
          office_id: null,
          role_id: null,
          division_id: null,
          team_id: null,
        },
      };
    }
  }

  private async getUserAdditionalInfo(userId: number): Promise<any> {
    const today = new Date();
    const todayStart = new Date(today.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const todayEnd = new Date(today.toISOString().split('T')[0] + 'T23:59:59.999Z');

    // Tháng hiện tại để tính leave days
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Thực hiện tất cả queries song song để tối ưu performance
    const [userInfo, firstContract, todayTimesheet, usedLeaveDays, assignedDevices, userDivision] = await Promise.all([
      // Lấy thông tin user cơ bản
      this.prisma.user_information.findFirst({
        where: {
          user_id: userId,
          deleted_at: null,
        },
        select: {
          position_id: true,
          level_id: true,
          office_id: true,
          role_id: true,
        },
      }),

      // Lấy thời gian gia nhập công ty từ contract đầu tiên
      this.prisma.contracts.findFirst({
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
      }),

      // Lấy thông tin chấm công hôm nay
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

      // Tính tổng số ngày phép đã sử dụng trong tháng
      this.prisma.day_offs.aggregate({
        where: {
          user_id: userId,
          start_date: {
            gte: monthStart,
            lte: monthEnd,
          },
          status: 'APPROVED',
          type: 'PAID',
          deleted_at: null,
        },
        _sum: {
          total: true,
        },
      }),

      // Lấy danh sách thiết bị được cấp
      this.prisma.user_devices.findMany({
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
      }),

      // Lấy thông tin division và team từ user_division
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

    // Tính số ngày phép còn lại (mặc định 12 ngày/năm)
    const annualLeaveQuota = 12;
    const monthlyLeaveQuota = annualLeaveQuota / 12; // Chia đều theo tháng
    const usedLeave = usedLeaveDays._sum.total || 0;
    const remainingLeave = Math.max(0, monthlyLeaveQuota - usedLeave);

    // Format assigned devices
    const formattedDevices = assignedDevices.map((device) => ({
      id: device.id,
      name: device.device_name || 'Unknown Device',
      type: device.device_type?.toLowerCase() || 'unknown',
      serial: device.device_serial || 'N/A',
      assigned_date: device.assigned_date,
      notes: device.notes || '',
    }));

    // Xác định join_date từ contract đầu tiên
    const joinDate = firstContract?.start_date || null;

    return {
      join_date: joinDate,
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
      remaining_leave_days: Math.round(remainingLeave * 10) / 10, // Làm tròn 1 chữ số thập phân
      annual_leave_quota: annualLeaveQuota,
      used_leave_days: usedLeave,
      assigned_devices: formattedDevices,
      // Thêm thông tin tổ chức
      organization: {
        position_id: userInfo?.position_id || null,
        level_id: userInfo?.level_id || null,
        office_id: userInfo?.office_id || null,
        role_id: userInfo?.role_id || null,
        division_id: userDivision?.divisionId || null,
        team_id: userDivision?.teamId || null,
      },
    };
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
    this.validatePasswordStrength(newPassword);

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
    const hashedPassword = await bcrypt.hash(newPassword, 12);

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
    this.validatePasswordStrength(newPassword);

    // Kiểm tra mật khẩu mới có khác mật khẩu hiện tại không
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }

    // Mã hóa mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

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
    this.validatePasswordStrength(newPassword);

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
    const hashedPassword = await bcrypt.hash(newPassword, 12);

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
