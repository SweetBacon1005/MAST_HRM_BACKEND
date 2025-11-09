import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export interface IpValidationResult {
  isValid: boolean;
  isOfficeNetwork: boolean;
  clientIp: string;
  allowedIps: string[];
  hasApprovedRemoteRequest: boolean;
  message?: string;
}

@Injectable()
export class IpValidationService {
  private readonly logger = new Logger(IpValidationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Kiểm tra IP có được phép check in/out không
   * @param userId ID của user
   * @param clientIp IP của client
   * @param workDate Ngày làm việc (YYYY-MM-DD)
   * @returns Kết quả validation
   */
  async validateIpForAttendance(
    userId: number,
    clientIp: string,
    workDate: string,
  ): Promise<IpValidationResult> {
    try {
      // Lấy danh sách IP văn phòng được phép
      const allowedIps = await this.getOfficeIpAddresses();
      
      // Kiểm tra IP có trong danh sách văn phòng không
      const isOfficeNetwork = this.isIpInAllowedList(clientIp, allowedIps);

      // Nếu đang ở văn phòng thì cho phép
      if (isOfficeNetwork) {
        return {
          isValid: true,
          isOfficeNetwork: true,
          clientIp,
          allowedIps,
          hasApprovedRemoteRequest: false,
          message: 'Check in/out từ văn phòng được phép',
        };
      }

      // Nếu không ở văn phòng, kiểm tra có remote work request được duyệt không
      const hasApprovedRemoteRequest = await this.checkApprovedRemoteRequest(
        userId,
        workDate,
      );

      if (hasApprovedRemoteRequest) {
        return {
          isValid: true,
          isOfficeNetwork: false,
          clientIp,
          allowedIps,
          hasApprovedRemoteRequest: true,
          message: 'Check in/out từ xa được phép do có đơn remote work đã duyệt',
        };
      }

      // Không được phép check in/out
      return {
        isValid: false,
        isOfficeNetwork: false,
        clientIp,
        allowedIps,
        hasApprovedRemoteRequest: false,
        message: 'Không được phép check in/out từ ngoài văn phòng. Vui lòng tạo đơn xin làm việc từ xa và chờ phê duyệt.',
      };
    } catch (error) {
      this.logger.error(
        `Lỗi khi kiểm tra IP validation cho user ${userId}: ${error.message}`,
        error.stack,
      );
      
      // Trong trường hợp lỗi, cho phép check in/out để không ảnh hưởng đến hoạt động
      return {
        isValid: true,
        isOfficeNetwork: false,
        clientIp,
        allowedIps: [],
        hasApprovedRemoteRequest: false,
        message: 'Lỗi hệ thống khi kiểm tra IP, tạm thời cho phép check in/out',
      };
    }
  }

  /**
   * Lấy danh sách IP văn phòng được phép từ environment variables
   */
  async getOfficeIpAddresses(): Promise<string[]> {
    // Lấy từ environment variables
    const envIps = this.configService.get<string>('OFFICE_IP_ADDRESSES');
    if (envIps) {
      return envIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
    }

    // Fallback: IP mặc định
    const defaultIps = this.configService.get<string>('DEFAULT_OFFICE_IPS', '192.168.1.0/24,10.0.0.0/8,127.0.0.1');
    return defaultIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
  }

  /**
   * Kiểm tra IP có trong danh sách cho phép không
   */
  private isIpInAllowedList(clientIp: string, allowedIps: string[]): boolean {
    for (const allowedIp of allowedIps) {
      if (this.isIpMatch(clientIp, allowedIp)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Kiểm tra IP có khớp với pattern không (hỗ trợ CIDR và wildcard)
   */
  private isIpMatch(clientIp: string, pattern: string): boolean {
    // Exact match
    if (clientIp === pattern) {
      return true;
    }

    // CIDR notation (e.g., 192.168.1.0/24)
    if (pattern.includes('/')) {
      return this.isIpInCidr(clientIp, pattern);
    }

    // Wildcard pattern (e.g., 192.168.1.*)
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '\\d+') + '$');
      return regex.test(clientIp);
    }

    return false;
  }

  /**
   * Kiểm tra IP có trong CIDR range không
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    try {
      const [network, prefixLength] = cidr.split('/');
      const mask = (0xffffffff << (32 - parseInt(prefixLength))) >>> 0;
      
      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      
      return (ipNum & mask) === (networkNum & mask);
    } catch (error) {
      this.logger.warn(`Lỗi khi kiểm tra CIDR ${cidr} cho IP ${ip}:`, error);
      return false;
    }
  }

  /**
   * Chuyển IP string thành number
   */
  private ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Kiểm tra có remote work request được duyệt cho ngày cụ thể không
   */
  private async checkApprovedRemoteRequest(
    userId: number,
    workDate: string,
  ): Promise<boolean> {
    try {
      // Kiểm tra trong bảng time_sheets có remote work được duyệt không
      const approvedRemoteWork = await this.prisma.time_sheets.findFirst({
        where: {
          user_id: userId,
          work_date: new Date(workDate),
          remote: 'REMOTE',
          status: 'APPROVED',
          deleted_at: null,
        },
      });

      if (approvedRemoteWork) {
        return true;
      }

      // Kiểm tra trong các bảng requests khác nếu có
      // TODO: Có thể mở rộng để kiểm tra các loại request khác

      return false;
    } catch (error) {
      this.logger.error(
        `Lỗi khi kiểm tra approved remote request cho user ${userId}, ngày ${workDate}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Lấy IP thực của client từ request headers
   */
  getClientIp(request: any): string {
    // Kiểm tra các headers phổ biến cho IP thực
    const xForwardedFor = request.headers['x-forwarded-for'];
    const xRealIp = request.headers['x-real-ip'];
    const xClientIp = request.headers['x-client-ip'];
    const cfConnectingIp = request.headers['cf-connecting-ip']; // Cloudflare

    if (xForwardedFor) {
      // X-Forwarded-For có thể chứa nhiều IP, lấy IP đầu tiên
      return xForwardedFor.split(',')[0].trim();
    }

    if (xRealIp) {
      return xRealIp;
    }

    if (xClientIp) {
      return xClientIp;
    }

    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    // Fallback to connection remote address
    return request.connection?.remoteAddress || 
           request.socket?.remoteAddress || 
           request.ip || 
           '127.0.0.1';
  }

  /**
   * Kiểm tra IP có hợp lệ không (chỉ validation, không thêm vào env)
   */
  validateIpFormat(ipAddress: string): boolean {
    try {
      // Kiểm tra IP đơn lẻ
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ipAddress)) {
        const parts = ipAddress.split('.');
        return parts.every(part => {
          const num = parseInt(part);
          return num >= 0 && num <= 255;
        });
      }

      // Kiểm tra CIDR notation
      if (ipAddress.includes('/')) {
        const [network, prefix] = ipAddress.split('/');
        const prefixNum = parseInt(prefix);
        return this.validateIpFormat(network) && prefixNum >= 0 && prefixNum <= 32;
      }

      // Kiểm tra wildcard pattern
      if (ipAddress.includes('*')) {
        const pattern = ipAddress.replace(/\*/g, '255');
        return this.validateIpFormat(pattern);
      }

      return false;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Lấy thông tin về cấu hình IP hiện tại
   */
  getIpConfiguration(): {
    source: 'OFFICE_IP_ADDRESSES' | 'DEFAULT_OFFICE_IPS';
    ips: string[];
    envValue: string | undefined;
  } {
    const envIps = this.configService.get<string>('OFFICE_IP_ADDRESSES');
    
    if (envIps) {
      return {
        source: 'OFFICE_IP_ADDRESSES',
        ips: envIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0),
        envValue: envIps,
      };
    }

    const defaultIps = this.configService.get<string>('DEFAULT_OFFICE_IPS', '192.168.1.0/24,10.0.0.0/8,127.0.0.1');
    return {
      source: 'DEFAULT_OFFICE_IPS',
      ips: defaultIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0),
      envValue: defaultIps,
    };
  }
}