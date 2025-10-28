import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokensDto } from './dto/tokens.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SendChangePasswordOtpDto } from './dto/send-change-password-otp.dto';
import { ChangePasswordWithOtpDto } from './dto/change-password-with-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordWithTokenDto } from './dto/reset-password-with-token.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { Public } from './decorators/public.decorator';
import { GetCurrentUser } from './decorators/get-current-user.decorator';
import { RequirePermission } from './decorators/require-permission.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công',
    type: TokensDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Email hoặc mật khẩu không đúng',
  })
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Đăng ký thành công',
    type: TokensDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Làm mới token thành công',
    type: TokensDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token không hợp lệ',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Đăng xuất' })
  @ApiResponse({
    status: 200,
    description: 'Đăng xuất thành công',
  })
  async logout(@GetCurrentUser('id') userId: number) {
    return this.authService.logOut(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Lấy thông tin user hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin user với thông tin bổ sung',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Nguyễn Văn A' },
        email: { type: 'string', example: 'user@example.com' },
        email_verified_at: { type: 'string', format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        join_date: {
          type: 'string',
          format: 'date',
          description: 'Thời gian gia nhập công ty',
        },
        today_attendance: {
          type: 'object',
          properties: {
            checkin: { type: 'string', format: 'date-time', nullable: true },
            checkout: { type: 'string', format: 'date-time', nullable: true },
            total_work_time: {
              type: 'number',
              description: 'Tổng thời gian làm việc (phút)',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
            },
          },
        },
        remaining_leave_days: {
          type: 'number',
          description: 'Số ngày phép còn lại trong tháng',
        },
        assigned_devices: {
          type: 'array',
          description: 'Danh sách thiết bị được cấp từ assets',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Laptop Dell XPS 13' },
              type: { type: 'string', example: 'laptop' },
              code: { type: 'string', example: 'LAPTOP-001' },
              brand: { type: 'string', example: 'Dell' },
              model: { type: 'string', example: 'XPS 13 9320' },
              serial: { type: 'string', nullable: true, example: 'SN123456' },
              assigned_date: {
                type: 'string',
                format: 'date',
                example: '2024-01-01',
              },
              notes: {
                type: 'string',
                nullable: true,
                example: 'Thiết bị mới',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token không hợp lệ',
  })
  async getProfile(@GetCurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi mã OTP để đặt lại mật khẩu' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Mã OTP đã được gửi thành công',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Nếu email tồn tại, mã OTP đã được gửi đến email của bạn',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Gửi quá nhiều yêu cầu hoặc dữ liệu không hợp lệ',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực mã OTP cho forgot password' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Xác thực OTP thành công',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Mã OTP hợp lệ',
        },
        isValid: {
          type: 'boolean',
          example: true,
        },
        resetToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'Token để reset password (có thời hạn 15 phút)',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Mã OTP không hợp lệ hoặc đã hết hạn',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Mã OTP không hợp lệ hoặc đã hết hạn',
        },
        isValid: {
          type: 'boolean',
          example: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Email không tồn tại trong hệ thống',
  })
  async verifyOTP(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOTP(verifyOtpDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu với mã OTP' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Đặt lại mật khẩu thành công',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Đặt lại mật khẩu thành công',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Mã OTP không hợp lệ hoặc đã hết hạn',
  })
  @ApiResponse({
    status: 404,
    description: 'Email không tồn tại trong hệ thống',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @Post('reset-password-with-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu với reset token từ verify OTP' })
  @ApiBody({ type: ResetPasswordWithTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Đặt lại mật khẩu thành công',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Đặt lại mật khẩu thành công',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token không hợp lệ hoặc đã hết hạn',
  })
  @ApiResponse({
    status: 404,
    description: 'Email không tồn tại trong hệ thống',
  })
  async resetPasswordWithToken(
    @Body() resetPasswordWithTokenDto: ResetPasswordWithTokenDto,
  ) {
    return this.authService.resetPasswordWithToken(resetPasswordWithTokenDto);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('user.profile.update')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Thay đổi mật khẩu (yêu cầu mật khẩu hiện tại)' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Thay đổi mật khẩu thành công',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Thay đổi mật khẩu thành công',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Mật khẩu hiện tại không đúng hoặc mật khẩu mới trùng với mật khẩu cũ',
  })
  @ApiResponse({
    status: 401,
    description: 'Token không hợp lệ',
  })
  async changePassword(
    @GetCurrentUser('id') userId: number,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }

  @Public()
  @Post('send-change-password-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gửi mã OTP để thay đổi mật khẩu (không cần mật khẩu hiện tại)',
  })
  @ApiBody({ type: SendChangePasswordOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Mã OTP đã được gửi thành công',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Nếu email tồn tại, mã OTP đã được gửi đến email của bạn',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Gửi quá nhiều yêu cầu hoặc dữ liệu không hợp lệ',
  })
  async sendChangePasswordOTP(
    @Body() sendChangePasswordOtpDto: SendChangePasswordOtpDto,
  ) {
    return this.authService.sendChangePasswordOTP(
      sendChangePasswordOtpDto.email,
    );
  }

  @Public()
  @Post('change-password-with-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Thay đổi mật khẩu với mã OTP' })
  @ApiBody({ type: ChangePasswordWithOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Thay đổi mật khẩu thành công',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Thay đổi mật khẩu thành công',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Mã OTP không hợp lệ, đã hết hạn hoặc dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: 404,
    description: 'Email không tồn tại trong hệ thống',
  })
  async changePasswordWithOTP(
    @Body() changePasswordWithOtpDto: ChangePasswordWithOtpDto,
  ) {
    return this.authService.changePasswordWithOTP(
      changePasswordWithOtpDto.email,
      changePasswordWithOtpDto.otp,
      changePasswordWithOtpDto.newPassword,
    );
  }
}
