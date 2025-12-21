import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export interface ip_validationResult {
  isValid: boolean;
  is_office_network: boolean;
  client_ip: string;
  allowed_ips: string[];
  has_approved_remote_request: boolean;
  message?: string;
}

@Injectable()
export class ip_validationService {
  private readonly logger = new Logger(ip_validationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async validateIpForAttendance(
    user_id: number,
    client_ip: string,
    workDate: string,
  ): Promise<ip_validationResult> {
    try {
      const allowed_ips = await this.getOfficeIpAddresses();
      
      const is_office_network = this.isIpInAllowedList(client_ip, allowed_ips);

      if (is_office_network) {
        return {
          isValid: true,
          is_office_network: true,
          client_ip,
          allowed_ips,
          has_approved_remote_request: false,
          message: 'Check in/out từ văn phòng được phép',
        };
      }

      const has_approved_remote_request = await this.checkApprovedRemoteRequest(
        user_id,
        workDate,
      );

      if (has_approved_remote_request) {
        return {
          isValid: true,
          is_office_network: false,
          client_ip,
          allowed_ips,
          has_approved_remote_request: true,
          message: 'Check in/out từ xa được phép do có đơn remote work đã duyệt',
        };
      }

      return {
        isValid: false,
        is_office_network: false,
        client_ip,
        allowed_ips,
        has_approved_remote_request: false,
        message: 'Không được phép check in/out từ ngoài văn phòng. Vui lòng tạo đơn xin làm việc từ xa và chờ phê duyệt.',
      };
    } catch (error) {
      this.logger.error(
        `Lỗi khi kiểm tra IP validation cho user ${user_id}: ${error.message}`,
        error.stack,
      );
      
      return {
        isValid: true,
        is_office_network: false,
        client_ip,
        allowed_ips: [],
        has_approved_remote_request: false,
        message: 'Lỗi hệ thống khi kiểm tra IP, tạm thời cho phép check in/out',
      };
    }
  }

  /**
   * Lấy danh sách IP văn phòng được phép từ environment variables
   */
  async getOfficeIpAddresses(): Promise<string[]> {
    const envIps = this.configService.get<string>('OFFICE_IP_ADDRESSES');
    if (envIps) {
      return envIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
    }

    const defaultIps = this.configService.get<string>('DEFAULT_OFFICE_IPS', '192.168.1.0/24,10.0.0.0/8,127.0.0.1');
    return defaultIps.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
  }

  /**
   * Kiểm tra IP có trong danh sách cho phép không
   */
  private isIpInAllowedList(client_ip: string, allowed_ips: string[]): boolean {
    for (const allowedIp of allowed_ips) {
      if (this.isIpMatch(client_ip, allowedIp)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Kiểm tra IP có khớp với pattern không (hỗ trợ CIDR và wildcard)
   */
  private isIpMatch(client_ip: string, pattern: string): boolean {
    // Exact match
    if (client_ip === pattern) {
      return true;
    }

    // CIDR notation (e.g., 192.168.1.0/24)
    if (pattern.includes('/')) {
      return this.isIpInCidr(client_ip, pattern);
    }

    // Wildcard pattern (e.g., 192.168.1.*)
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '\\d+') + '$');
      return regex.test(client_ip);
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

  private async checkApprovedRemoteRequest(
    user_id: number,
    workDate: string,
  ): Promise<boolean> {
    try {
      const approvedRemoteWork = await this.prisma.time_sheets.findFirst({
        where: {
          user_id: user_id,
          work_date: new Date(workDate),
          remote: 'REMOTE',
          deleted_at: null,
        },
      });

      if (approvedRemoteWork) {
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Lỗi khi kiểm tra approved remote request cho user ${user_id}, ngày ${workDate}:`,
        error,
      );
      return false;
    }
  }

  getclient_ip(request: any): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    const xRealIp = request.headers['x-real-ip'];
    const xclient_ip = request.headers['x-client-ip'];
    const cfConnectingIp = request.headers['cf-connecting-ip']; // Cloudflare

    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }

    if (xRealIp) {
      return xRealIp;
    }

    if (xclient_ip) {
      return xclient_ip;
    }

    if (cfConnectingIp) {
      return cfConnectingIp;
    }

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
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ipAddress)) {
        const parts = ipAddress.split('.');
        return parts.every(part => {
          const num = parseInt(part);
          return num >= 0 && num <= 255;
        });
      }

      if (ipAddress.includes('/')) {
        const [network, prefix] = ipAddress.split('/');
        const prefixNum = parseInt(prefix);
        return this.validateIpFormat(network) && prefixNum >= 0 && prefixNum <= 32;
      }

      if (ipAddress.includes('*')) {
        const pattern = ipAddress.replace(/\*/g, '255');
        return this.validateIpFormat(pattern);
      }

      return false;
    } catch (_error) {
      return false;
    }
  }

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