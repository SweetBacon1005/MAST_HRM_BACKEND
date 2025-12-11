import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOTPEmail(email: string, otpCode: string, type: string): Promise<void> {
    const subject = this.getEmailSubject(type);
    const htmlContent = this.getEmailTemplate(otpCode, type);

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM'),
      to: email,
      subject,
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new Error(`Không thể gửi email: ${error.message}`);
    }
  }

  private getEmailSubject(type: string): string {
    switch (type) {
      case 'PASSWORD_RESET':
        return 'Mã OTP để đặt lại mật khẩu';
      case 'CHANGE_PASSWORD':
        return 'Mã OTP để thay đổi mật khẩu';
      case 'EMAIL_VERIFICATION':
        return 'Mã OTP để xác thực email';
      default:
        return 'Mã OTP';
    }
  }

  private getEmailTemplate(otpCode: string, type: string): string {
    const title = this.getEmailTitle(type);
    const description = this.getEmailDescription(type);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
            border: 1px solid #ddd;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .otp-code {
            background-color: #3498db;
            color: white;
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            letter-spacing: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">MAST HRM</div>
          </div>
          
          <div class="content">
            <h2>${title}</h2>
            <p>${description}</p>
            
            <p>Mã OTP của bạn là:</p>
            <div class="otp-code">${otpCode}</div>
            
            <p>Mã này có hiệu lực trong 10 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
            
            <div class="warning">
              <strong>Lưu ý:</strong> Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
            </div>
          </div>
          
          <div class="footer">
            <p>Email này được gửi tự động từ hệ thống MAST HRM.</p>
            <p>Vui lòng không trả lời email này.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getEmailTitle(type: string): string {
    switch (type) {
      case 'PASSWORD_RESET':
        return 'Đặt lại mật khẩu';
      case 'CHANGE_PASSWORD':
        return 'Thay đổi mật khẩu';
      case 'EMAIL_VERIFICATION':
        return 'Xác thực email';
      default:
        return 'Mã OTP';
    }
  }

  private getEmailDescription(type: string): string {
    switch (type) {
      case 'PASSWORD_RESET':
        return 'Bạn đã yêu cầu đặt lại mật khẩu. Sử dụng mã OTP bên dưới để hoàn tất quá trình đặt lại mật khẩu.';
      case 'CHANGE_PASSWORD':
        return 'Bạn đã yêu cầu thay đổi mật khẩu. Sử dụng mã OTP bên dưới để xác thực và hoàn tất quá trình thay đổi mật khẩu.';
      case 'EMAIL_VERIFICATION':
        return 'Bạn đã yêu cầu xác thực email. Sử dụng mã OTP bên dưới để hoàn tất quá trình xác thực.';
      default:
        return 'Sử dụng mã OTP bên dưới để hoàn tất quá trình xác thực.';
    }
  }
}
