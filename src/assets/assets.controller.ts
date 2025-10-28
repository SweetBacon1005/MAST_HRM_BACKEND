import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import {
  CreateAssetRequestDto,
  ApproveAssetRequestDto,
  FulfillAssetRequestDto,
} from './dto/asset-request.dto';
import {
  AssetPaginationDto,
  AssetRequestPaginationDto,
} from './dto/pagination-queries.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLE_NAMES } from '../auth/constants/role.constants';

@ApiTags('Assets Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ===== ASSET CRUD FOR HR =====

  @Post()
  @UseGuards(RolesGuard)
  @Roles(ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tạo tài sản mới (HR only)' })
  @ApiResponse({
    status: 201,
    description: 'Tạo tài sản thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Tạo tài sản thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Laptop Dell XPS 13' },
            asset_code: { type: 'string', example: 'LAPTOP-001' },
            category: { type: 'string', example: 'Laptop' },
            status: { type: 'string', example: 'AVAILABLE' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  createAsset(@Body() createAssetDto: CreateAssetDto, @Request() req: any) {
    return this.assetsService.createAsset(createAssetDto, req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách tài sản (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tài sản',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Laptop Dell XPS 13' },
              asset_code: { type: 'string', example: 'LAPTOP-001' },
              category: { type: 'string', example: 'Laptop' },
              status: { type: 'string', example: 'AVAILABLE' },
              assigned_user: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 123 },
                  email: { type: 'string', example: 'user@example.com' },
                  user_information: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'Nguyễn Văn A' },
                    },
                  },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  findAllAssets(@Query() paginationDto: AssetPaginationDto) {
    return this.assetsService.findAllAssets(paginationDto);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles(ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Thống kê tài sản (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Thống kê tài sản',
    schema: {
      type: 'object',
      properties: {
        assets: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            available: { type: 'number', example: 60 },
            assigned: { type: 'number', example: 35 },
            maintenance: { type: 'number', example: 5 },
            utilization_rate: { type: 'number', example: 35 },
          },
        },
        requests: {
          type: 'object',
          properties: {
            pending: { type: 'number', example: 10 },
            approved: { type: 'number', example: 5 },
          },
        },
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', example: 'Laptop' },
              count: { type: 'number', example: 50 },
            },
          },
        },
      },
    },
  })
  getAssetStatistics() {
    return this.assetsService.getAssetStatistics();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lấy chi tiết tài sản (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết tài sản',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Laptop Dell XPS 13' },
            asset_code: { type: 'string', example: 'LAPTOP-001' },
            category: { type: 'string', example: 'Laptop' },
            status: { type: 'string', example: 'AVAILABLE' },
            purchase_date: { type: 'string', format: 'date' },
            purchase_price: { type: 'string', example: '25000000' },
            assigned_user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 123 },
                email: { type: 'string', example: 'user@example.com' },
                user_information: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Nguyễn Văn A' },
                  },
                },
              },
            },
            asset_requests: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  request_type: { type: 'string', example: 'REQUEST' },
                  status: { type: 'string', example: 'PENDING' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  })
  findOneAsset(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findOneAsset(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cập nhật tài sản (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật tài sản thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cập nhật tài sản thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Laptop Dell XPS 13' },
            asset_code: { type: 'string', example: 'LAPTOP-001' },
            status: { type: 'string', example: 'ASSIGNED' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  updateAsset(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAssetDto: UpdateAssetDto,
    @Request() req: any,
  ) {
    return this.assetsService.updateAsset(id, updateAssetDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Xóa tài sản (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Xóa tài sản thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Xóa tài sản thành công' },
      },
    },
  })
  removeAsset(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.assetsService.removeAsset(id, req.user.id);
  }

  // ===== ASSET ASSIGNMENT =====

  @Post(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Gán tài sản cho user (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Gán tài sản thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Gán tài sản thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            status: { type: 'string', example: 'ASSIGNED' },
            assigned_to: { type: 'number', example: 123 },
            assigned_date: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  assignAsset(
    @Param('id', ParseIntPipe) assetId: number,
    @Body() body: { user_id: number; notes?: string },
    @Request() req: any,
  ) {
    return this.assetsService.assignAsset(assetId, body.user_id, req.user.id, body.notes);
  }

  @Post(':id/unassign')
  @UseGuards(RolesGuard)
  @Roles(ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Thu hồi tài sản từ user (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Thu hồi tài sản thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Thu hồi tài sản thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            status: { type: 'string', example: 'AVAILABLE' },
            assigned_to: { type: 'null' },
            assigned_date: { type: 'null' },
          },
        },
      },
    },
  })
  unassignAsset(
    @Param('id', ParseIntPipe) assetId: number,
    @Body() body: { notes?: string },
    @Request() req: any,
  ) {
    return this.assetsService.unassignAsset(assetId, req.user.id, body.notes);
  }

  // ===== USER DEVICES FROM ASSETS =====

  @Get('my-devices')
  @ApiOperation({ summary: 'Lấy danh sách thiết bị được gán cho user hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách thiết bị của user',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Laptop Dell XPS 13' },
              asset_code: { type: 'string', example: 'LAPTOP-001' },
              category: { type: 'string', example: 'Laptop' },
              brand: { type: 'string', example: 'Dell' },
              model: { type: 'string', example: 'XPS 13 9320' },
              serial_number: { type: 'string', example: 'SN123456' },
              assigned_date: { type: 'string', format: 'date' },
              notes: { type: 'string', example: 'Thiết bị mới' },
            },
          },
        },
      },
    },
  })
  getMyDevices(@Request() req: any) {
    return this.assetsService.getUserDevices(req.user.id);
  }

  // ===== ASSET REQUESTS FOR USERS =====

  @Post('requests')
  @ApiOperation({ summary: 'Tạo request tài sản (User)' })
  @ApiResponse({
    status: 201,
    description: 'Tạo request tài sản thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Tạo request tài sản thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            request_type: { type: 'string', example: 'REQUEST' },
            category: { type: 'string', example: 'Laptop' },
            status: { type: 'string', example: 'PENDING' },
            priority: { type: 'string', example: 'NORMAL' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  createAssetRequest(@Body() createAssetRequestDto: CreateAssetRequestDto, @Request() req: any) {
    createAssetRequestDto.user_id = req.user.id;
    return this.assetsService.createAssetRequest(createAssetRequestDto);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Lấy danh sách request tài sản' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách request tài sản',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              request_type: { type: 'string', example: 'REQUEST' },
              category: { type: 'string', example: 'Laptop' },
              status: { type: 'string', example: 'PENDING' },
              priority: { type: 'string', example: 'NORMAL' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 123 },
                  email: { type: 'string', example: 'user@example.com' },
                  user_information: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', example: 'Nguyễn Văn A' },
                    },
                  },
                },
              },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  findAllAssetRequests(@Query() paginationDto: AssetRequestPaginationDto) {
    return this.assetsService.findAllAssetRequests(paginationDto);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Lấy chi tiết request tài sản' })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết request tài sản',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            request_type: { type: 'string', example: 'REQUEST' },
            category: { type: 'string', example: 'Laptop' },
            description: { type: 'string', example: 'Cần laptop cho công việc development' },
            justification: { type: 'string', example: 'Laptop hiện tại đã hỏng' },
            status: { type: 'string', example: 'PENDING' },
            priority: { type: 'string', example: 'NORMAL' },
            expected_date: { type: 'string', format: 'date' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 123 },
                email: { type: 'string', example: 'user@example.com' },
                user_information: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Nguyễn Văn A' },
                  },
                },
              },
            },
            asset: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                name: { type: 'string', example: 'Laptop Dell XPS 13' },
                asset_code: { type: 'string', example: 'LAPTOP-001' },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  findOneAssetRequest(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findOneAssetRequest(id);
  }

  // ===== ASSET REQUEST APPROVAL FOR HR =====

  @Post('requests/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Duyệt/từ chối request tài sản (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Xử lý request thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Phê duyệt request thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            status: { type: 'string', example: 'APPROVED' },
            approved_by: { type: 'number', example: 456 },
            approved_at: { type: 'string', format: 'date-time' },
            asset_id: { type: 'number', example: 123 },
          },
        },
      },
    },
  })
  approveAssetRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() approveDto: ApproveAssetRequestDto,
    @Request() req: any,
  ) {
    return this.assetsService.approveAssetRequest(id, approveDto, req.user.id);
  }

  @Post('requests/:id/fulfill')
  @UseGuards(RolesGuard)
  @Roles(ROLE_NAMES.HR_MANAGER, ROLE_NAMES.ADMIN, ROLE_NAMES.SUPER_ADMIN)
  @ApiOperation({ summary: 'Giao tài sản theo request (HR only)' })
  @ApiResponse({
    status: 200,
    description: 'Giao tài sản thành công',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Giao tài sản thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            status: { type: 'string', example: 'FULFILLED' },
            asset_id: { type: 'number', example: 123 },
            fulfilled_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  fulfillAssetRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() fulfillDto: FulfillAssetRequestDto,
    @Request() req: any,
  ) {
    return this.assetsService.fulfillAssetRequest(id, fulfillDto, req.user.id);
  }
}
