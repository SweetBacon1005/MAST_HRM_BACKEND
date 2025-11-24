import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ROLE_NAMES } from 'src/auth/constants/role.constants';
import { GetCurrentUser } from 'src/auth/decorators/get-current-user.decorator';
import { ASSET_PERMISSIONS } from '../auth/constants/permission.constants';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AssetsService } from './assets.service';
import {
  CreateAssetRequestDto,
  FulfillAssetRequestDto,
  ReviewAssetRequestDto,
} from './dto/asset-request.dto';
import { AssignAssetDto, UnassignAssetDto } from './dto/assign-asset.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import {
  AssetPaginationDto,
  AssetRequestPaginationDto,
} from './dto/pagination-queries.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@ApiTags('Assets Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ===== ASSET CRUD FOR HR =====
  @Post('requests')
  @RequirePermission(ASSET_PERMISSIONS.REQUEST_CREATE)
  @ApiOperation({ summary: 'Tạo request tài sản' })
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
  createAssetRequest(
    @Body() createAssetRequestDto: CreateAssetRequestDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    createAssetRequestDto.user_id = user_id;
    return this.assetsService.createAssetRequest(createAssetRequestDto);
  }

  @Post('requests/:id/fulfill')
  @RequirePermission(ASSET_PERMISSIONS.REQUEST_APPROVE)
  @ApiOperation({ summary: 'Giao tài sản theo request' })
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
    @GetCurrentUser('id') fulfillerId: number,
  ) {
    return this.assetsService.fulfillAssetRequest(id, fulfillDto, fulfillerId);
  }

  @Post('requests/:id/review')
  @RequirePermission(ASSET_PERMISSIONS.REQUEST_APPROVE)
  @ApiOperation({ summary: 'Duyệt/từ chối request tài sản' })
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
  reviewAssetRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() reviewDto: ReviewAssetRequestDto,
    @GetCurrentUser('id') reviewerId: number,
  ) {
    return this.assetsService.reviewAssetRequest(id, reviewDto, reviewerId);
  }

  @Post(':id/assign')
  @RequirePermission(ASSET_PERMISSIONS.ASSIGN)
  @ApiOperation({ summary: 'Gán tài sản cho user' })
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
    @Body() body: AssignAssetDto,
    @GetCurrentUser('id') assignedBy: number,
  ) {
    return this.assetsService.assignAsset(
      assetId,
      body.user_id,
      assignedBy,
      body.notes,
    );
  }

  @Post(':id/unassign')
  @RequirePermission(ASSET_PERMISSIONS.UNASSIGN)
  @ApiOperation({ summary: 'Thu hồi tài sản từ user' })
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
    @Body() body: UnassignAssetDto,
    @GetCurrentUser('id') unassignedBy: number,
  ) {
    return this.assetsService.unassignAsset(assetId, unassignedBy, body.notes);
  }

  @Post()
  @RequirePermission(ASSET_PERMISSIONS.CREATE)
  @ApiOperation({ summary: 'Tạo tài sản mới' })
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
  createAsset(
    @Body() createAssetDto: CreateAssetDto,
    @GetCurrentUser('id') createdBy: number,
  ) {
    return this.assetsService.createAsset(createAssetDto, createdBy);
  }

  @Get('statistics')
  @RequirePermission(ASSET_PERMISSIONS.STATISTICS)
  @ApiOperation({ summary: 'Thống kê tài sản' })
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

  @Get('my-devices')
  @RequirePermission(ASSET_PERMISSIONS.READ)
  @ApiOperation({
    summary: 'Lấy danh sách thiết bị được gán cho user hiện tại',
  })
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
  getMyDevices(@GetCurrentUser('id') user_id: number) {
    return this.assetsService.getUserDevices(user_id);
  }

  // ===== ASSET REQUESTS FOR USERS =====

  @Get('requests')
  @RequirePermission(ASSET_PERMISSIONS.REQUEST_READ)
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
            total_pages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  findAllAssetRequests(
    @Query() paginationDto: AssetRequestPaginationDto,
    @GetCurrentUser('roles') roles: string[],
  ) {
    if (!roles.includes(ROLE_NAMES.HR_MANAGER)) {
      throw new ForbiddenException(
        'Bạn không có quyền xem danh sách request tài sản',
      );
    }
    return this.assetsService.findAllAssetRequests(paginationDto);
  }

  @Get('requests/my')
  @RequirePermission(ASSET_PERMISSIONS.REQUEST_READ)
  @ApiOperation({ summary: 'Lấy danh sách request tài sản của tôi' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách request tài sản của tôi',
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
              created_at: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 10 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total_pages: { type: 'number', example: 1 },
          },
        },
      },
    },
  })
  findMyAssetRequests(
    @Query() paginationDto: AssetRequestPaginationDto,
    @GetCurrentUser('id') user_id: number,
  ) {
    return this.assetsService.findMyAssetRequests(user_id, paginationDto);
  }

  @Get('requests/:id')
  @RequirePermission(ASSET_PERMISSIONS.REQUEST_READ)
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
            description: {
              type: 'string',
              example: 'Cần laptop cho công việc development',
            },
            justification: {
              type: 'string',
              example: 'Laptop hiện tại đã hỏng',
            },
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

  @Get(':id')
  @RequirePermission(ASSET_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Lấy chi tiết tài sản' })
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
  @RequirePermission(ASSET_PERMISSIONS.UPDATE)
  @ApiOperation({ summary: 'Cập nhật tài sản' })
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
    @GetCurrentUser('id') updatedBy: number,
  ) {
    return this.assetsService.updateAsset(id, updateAssetDto, updatedBy);
  }

  @Delete(':id')
  @RequirePermission(ASSET_PERMISSIONS.DELETE)
  @ApiOperation({ summary: 'Xóa tài sản' })
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
  removeAsset(
    @Param('id', ParseIntPipe) id: number,
    @GetCurrentUser('id') deletedBy: number,
  ) {
    return this.assetsService.removeAsset(id, deletedBy);
  }
  @Get()
  @RequirePermission(ASSET_PERMISSIONS.READ)
  @ApiOperation({ summary: 'Lấy danh sách tài sản' })
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
            total_pages: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  findAllAssets(@Query() paginationDto: AssetPaginationDto) {
    return this.assetsService.findAllAssets(paginationDto);
  }
}

