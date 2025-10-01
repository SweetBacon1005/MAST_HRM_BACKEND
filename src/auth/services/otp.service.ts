import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OtpType } from '@prisma/client';
import { EmailService } from '../../common/services/email.service';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async generateAndSendOTP(email: string, type: OtpType): Promise<string> {
    // Xóa tất cả OTP cũ của email này
    await this.cleanupExpiredOTPs(email, type);

    // Tạo mã OTP 6 số
    const otpCode = this.generateOTPCode();

    // Thời gian hết hạn: 10 phút
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Lưu OTP vào database
    await this.prisma.otp_codes.create({
      data: {
        email,
        code: otpCode,
        type,
        expires_at: expiresAt,
        is_used: false,
      },
    });

    // Gửi email
    await this.emailService.sendOTPEmail(email, otpCode, type);

    return otpCode;
  }

  async verifyOTP(email: string, code: string, type: OtpType): Promise<boolean> {
    const otp = await this.prisma.otp_codes.findFirst({
      where: {
        email,
        code,
        type,
        is_used: false,
        expires_at: {
          gt: new Date(),
        },
      },
    });

    if (!otp) {
      return false;
    }

    // Đánh dấu OTP đã được sử dụng
    await this.prisma.otp_codes.update({
      where: { id: otp.id },
      data: { is_used: true },
    });

    return true;
  }

  async cleanupExpiredOTPs(email: string, type: OtpType): Promise<void> {
    await this.prisma.otp_codes.deleteMany({
      where: {
        email,
        type,
        OR: [
          { is_used: true },
          { expires_at: { lt: new Date() } },
        ],
      },
    });
  }

  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async checkOTPRateLimit(email: string, type: OtpType): Promise<boolean> {
    // Kiểm tra số lượng OTP được gửi trong 1 giờ qua (tối đa 5 lần)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const otpCount = await this.prisma.otp_codes.count({
      where: {
        email,
        type,
        created_at: {
          gte: oneHourAgo,
        },
      },
    });

    return otpCount < 5;
  }
}
