import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { ip_validationService } from '../services/ip-validation.service';

@ApiTags('IP Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('ip-management')
export class IpManagementController {
  constructor(private readonly ip_validationService: ip_validationService) {}

  @Get('office-ips')
  @RequirePermission('system.config.read')
  @ApiOperation({ 
    summary: 'Lấy danh sách IP văn phòng được phép',
    description: 'Trả về danh sách tất cả IP addresses được phép check in/out từ environment variables'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách IP thành công',
    schema: {
      type: 'object',
      properties: {
        allowed_ips: {
          type: 'array',
          items: { type: 'string' },
          example: ['192.168.1.0/24', '10.0.0.100', '172.16.1.*']
        },
        total: { type: 'number', example: 3 },
        source: {
          type: 'string',
          enum: ['OFFICE_IP_ADDRESSES', 'DEFAULT_OFFICE_IPS'],
          example: 'OFFICE_IP_ADDRESSES'
        },
        envValue: {
          type: 'string',
          example: '192.168.1.0/24,10.0.0.100,172.16.1.*'
        },
        description: { 
          type: 'string', 
          example: 'Danh sách IP văn phòng được phép check in/out từ environment variables' 
        }
      }
    }
  })
  async getOfficeIpAddresses() {
    const config = this.ip_validationService.getIpConfiguration();
    
    return {
      allowed_ips: config.ips,
      total: config.ips.length,
      source: config.source,
      envValue: config.envValue,
      description: 'Danh sách IP văn phòng được phép check in/out từ environment variables',
    };
  }

  @Post('validate-format')
  @RequirePermission('system.config.read')
  @ApiOperation({ 
    summary: 'Kiểm tra định dạng IP có hợp lệ không',
    description: 'Validate định dạng IP address, CIDR notation, hoặc wildcard pattern'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ipAddress: { 
          type: 'string', 
          example: '192.168.1.100',
          description: 'IP address cần kiểm tra định dạng'
        }
      },
      required: ['ipAddress']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra định dạng thành công',
    schema: {
      type: 'object',
      properties: {
        ipAddress: { type: 'string', example: '192.168.1.100' },
        isValid: { type: 'boolean', example: true },
        format: { 
          type: 'string', 
          enum: ['single_ip', 'cidr_notation', 'wildcard_pattern', 'invalid'],
          example: 'single_ip'
        },
        message: { 
          type: 'string', 
          example: 'Định dạng IP hợp lệ' 
        }
      }
    }
  })
  async validateIpFormat(@Body('ipAddress') ipAddress: string) {
    const isValid = this.ip_validationService.validateIpFormat(ipAddress);
    
    let format = 'invalid';
    if (isValid) {
      if (ipAddress.includes('/')) {
        format = 'cidr_notation';
      } else if (ipAddress.includes('*')) {
        format = 'wildcard_pattern';
      } else {
        format = 'single_ip';
      }
    }

    return {
      ipAddress,
      isValid,
      format,
      message: isValid ? 'Định dạng IP hợp lệ' : 'Định dạng IP không hợp lệ',
    };
  }

  @Post('validate-ip')
  @RequirePermission('system.config.read')
  @ApiOperation({ 
    summary: 'Kiểm tra IP có được phép không',
    description: 'Kiểm tra một IP address có trong danh sách được phép check in/out không'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ipAddress: { 
          type: 'string', 
          example: '192.168.1.100',
          description: 'IP address cần kiểm tra'
        },
        user_id: {
          type: 'number',
          example: 123,
          description: 'ID của user (để kiểm tra remote work request)'
        },
        workDate: {
          type: 'string',
          format: 'date',
          example: '2024-01-15',
          description: 'Ngày làm việc (YYYY-MM-DD)'
        }
      },
      required: ['ipAddress', 'user_id', 'workDate']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Kiểm tra IP thành công',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean', example: true },
        is_office_network: { type: 'boolean', example: true },
        client_ip: { type: 'string', example: '192.168.1.100' },
        allowed_ips: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['192.168.1.0/24', '10.0.0.100']
        },
        has_approved_remote_request: { type: 'boolean', example: false },
        message: { 
          type: 'string', 
          example: 'Check in/out từ văn phòng được phép' 
        }
      }
    }
  })
  async validateIpAddress(
    @Body('ipAddress') ipAddress: string,
    @Body('user_id') user_id: number,
    @Body('workDate') workDate: string,
  ) {
    return await this.ip_validationService.validateIpForAttendance(
      user_id,
      ipAddress,
      workDate,
    );
  }
}
