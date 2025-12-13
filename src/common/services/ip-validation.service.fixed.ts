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
export class ip_validationServiceFixed {
  private readonly logger = new Logger('ip_validationService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * FIX 1: Validate IP format đúng
   */
  private isValidIpv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    
    return parts.every(part => {
      const num = parseInt(part, 10);
      // Kiểm tra: số hợp lệ, 0-255, không có leading zeros
      return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
    });
  }

  /**
   * FIX 2: Validate CIDR format và network address
   */
  private isValidCidr(cidr: string): boolean {
    const [network, prefixStr] = cidr.split('/');
    
    if (!network || !prefixStr) return false;
    if (!this.isValidIpv4(network)) return false;
    
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
    
    // Validate network address: host bits phải là 0
    const networkNum = this.ipToNumber(network);
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    const networkAddr = (networkNum & mask) >>> 0;
    
    if (networkNum !== networkAddr) {
      this.logger.warn(
        `CIDR không hợp lệ: ${cidr}. Network address phải là ${this.numberToIp(networkAddr)}/${prefix}`
      );
      return false;
    }
    
    return true;
  }

  /**
   * FIX 3: Wildcard regex đúng
   */
  private isWildcardMatch(ip: string, pattern: string): boolean {
    if (!this.isValidIpv4(ip)) return false;
    
    // Escape dots và thay * bằng regex match 1-3 digits
    const regexPattern = '^' + 
      pattern
        .replace(/\./g, '\\.')           // Escape dots
        .replace(/\*/g, '([0-9]{1,3})') // * → match 1-3 digits
      + '$';
    
    const regex = new RegExp(regexPattern);
    const match = regex.test(ip);
    
    // Validate matched octets
    if (match) {
      const parts = ip.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }
    
    return false;
  }

  /**
   * Kiểm tra IP có trong CIDR range không
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    try {
      if (!this.isValidIpv4(ip)) {
        this.logger.warn(`IP không hợp lệ: ${ip}`);
        return false;
      }
      
      if (!this.isValidCidr(cidr)) {
        this.logger.warn(`CIDR không hợp lệ: ${cidr}`);
        return false;
      }
      
      const [network, prefixLength] = cidr.split('/');
      const mask = (0xffffffff << (32 - parseInt(prefixLength))) >>> 0;
      
      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      
      return (ipNum & mask) === (networkNum & mask);
    } catch (error) {
      this.logger.error(`Lỗi khi kiểm tra CIDR ${cidr} cho IP ${ip}:`, error);
      return false;
    }
  }

  /**
   * Kiểm tra IP có match với pattern không
   */
  private isIpMatch(client_ip: string, pattern: string): boolean {
    // Validate client IP
    if (!this.isValidIpv4(client_ip)) {
      this.logger.warn(`Client IP không hợp lệ: ${client_ip}`);
      return false;
    }
    
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
      return this.isWildcardMatch(client_ip, pattern);
    }

    return false;
  }

  /**
   * Chuyển IP string thành number (với validation)
   */
  private ipToNumber(ip: string): number {
    if (!this.isValidIpv4(ip)) {
      throw new Error(`IP không hợp lệ: ${ip}`);
    }
    
    return ip.split('.').reduce((acc, octet) => {
      return (acc << 8) + parseInt(octet, 10);
    }, 0) >>> 0;
  }

  /**
   * Chuyển number thành IP string
   */
  private numberToIp(num: number): string {
    return [
      (num >>> 24) & 0xff,
      (num >>> 16) & 0xff,
      (num >>> 8) & 0xff,
      num & 0xff,
    ].join('.');
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
   * Lấy IP thực của client từ request headers
   */
  getclient_ip(request: any): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    const xRealIp = request.headers['x-real-ip'];
    const xclient_ip = request.headers['x-client-ip'];
    const cfConnectingIp = request.headers['cf-connecting-ip'];

    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }

    if (xRealIp) return xRealIp;
    if (xclient_ip) return xclient_ip;
    if (cfConnectingIp) return cfConnectingIp;

    return request.connection?.remoteAddress || 
           request.socket?.remoteAddress || 
           request.ip || 
           '127.0.0.1';
  }

  /**
   * BONUS: Check IP có phải private range không
   */
  private isPrivateIp(ip: string): boolean {
    if (!this.isValidIpv4(ip)) return false;
    
    const num = this.ipToNumber(ip);
    
    // Private ranges:
    // 10.0.0.0/8
    // 172.16.0.0/12
    // 192.168.0.0/16
    // 127.0.0.0/8 (loopback)
    
    return (
      this.isIpInCidr(ip, '10.0.0.0/8') ||
      this.isIpInCidr(ip, '172.16.0.0/12') ||
      this.isIpInCidr(ip, '192.168.0.0/16') ||
      this.isIpInCidr(ip, '127.0.0.0/8')
    );
  }

  /**
   * Validate IP configuration khi khởi động app
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const config = this.configService.get<string>('OFFICE_IP_ADDRESSES', '');
    const ips = config.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
    
    const errors: string[] = [];
    
    for (const ip of ips) {
      if (ip.includes('/')) {
        // CIDR
        if (!this.isValidCidr(ip)) {
          errors.push(`CIDR không hợp lệ: ${ip}`);
        }
      } else if (ip.includes('*')) {
        // Wildcard - basic check
        const parts = ip.split('.');
        if (parts.length !== 4) {
          errors.push(`Wildcard không hợp lệ: ${ip}`);
        }
      } else {
        // Exact IP
        if (!this.isValidIpv4(ip)) {
          errors.push(`IP không hợp lệ: ${ip}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
