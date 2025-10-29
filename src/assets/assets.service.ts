import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ActivityLogService } from '../common/services/activity-log.service';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { DEVICE_CATEGORIES, ASSET_STATUSES } from './constants/asset.constants';
import { ASSET_ERRORS, SUCCESS_MESSAGES } from '../common/constants/error-messages.constants';
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

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ===== ASSET CRUD FOR HR =====

  async createAsset(createAssetDto: CreateAssetDto, createdBy: number) {
    // Check if asset_code already exists
    const existingAsset = await this.prisma.assets.findFirst({
      where: {
        asset_code: createAssetDto.asset_code,
        deleted_at: null,
      },
    });

    if (existingAsset) {
      throw new BadRequestException(ASSET_ERRORS.SERIAL_NUMBER_EXISTS);
    }

    // Check if serial_number already exists (if provided)
    if (createAssetDto.serial_number) {
      const existingSerial = await this.prisma.assets.findFirst({
        where: {
          serial_number: createAssetDto.serial_number,
          deleted_at: null,
        },
      });

      if (existingSerial) {
        throw new BadRequestException(ASSET_ERRORS.SERIAL_NUMBER_EXISTS);
      }
    }

    const asset = await this.prisma.assets.create({
      data: {
        ...createAssetDto,
        category: createAssetDto.category as any,
        purchase_date: createAssetDto.purchase_date ? new Date(createAssetDto.purchase_date) : null,
        warranty_end_date: createAssetDto.warranty_end_date ? new Date(createAssetDto.warranty_end_date) : null,
        created_by: createdBy,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
        assigned_user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Log activity
    await this.activityLogService.logCrudOperation(
      'Asset',
      asset.id,
      'created',
      createdBy,
      {
        asset_code: asset.asset_code,
        name: asset.name,
        category: asset.category,
      }
    );

    return {
      message: SUCCESS_MESSAGES.CREATED_SUCCESSFULLY,
      data: asset,
    };
  }

  async findAllAssets(paginationDto: AssetPaginationDto = {}) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: any = {
      deleted_at: null,
    };

    // Build search conditions
    if (paginationDto.search) {
      whereConditions.OR = [
        { name: { contains: paginationDto.search, mode: 'insensitive' } },
        { asset_code: { contains: paginationDto.search, mode: 'insensitive' } },
        { description: { contains: paginationDto.search, mode: 'insensitive' } },
        { brand: { contains: paginationDto.search, mode: 'insensitive' } },
        { model: { contains: paginationDto.search, mode: 'insensitive' } },
      ];
    }

    if (paginationDto.category) whereConditions.category = paginationDto.category;
    if (paginationDto.status) whereConditions.status = paginationDto.status;
    if (paginationDto.assigned_to) whereConditions.assigned_to = paginationDto.assigned_to;
    if (paginationDto.brand) whereConditions.brand = { contains: paginationDto.brand, mode: 'insensitive' };

    const [assets, total] = await Promise.all([
      this.prisma.assets.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: { name: true },
              },
            },
          },
          assigned_user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: { name: true },
              },
            },
          },
        },
      }),
      this.prisma.assets.count({ where: whereConditions }),
    ]);

    return buildPaginationResponse(
      assets,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOneAsset(id: number) {
    const asset = await this.prisma.assets.findFirst({
      where: { id, deleted_at: null },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
        assigned_user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
        asset_requests: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                user_information: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(ASSET_ERRORS.ASSET_NOT_FOUND);
    }

    return {
      data: asset,
    };
  }

  async updateAsset(id: number, updateAssetDto: UpdateAssetDto, updatedBy: number) {
    const existingAsset = await this.prisma.assets.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existingAsset) {
      throw new NotFoundException(ASSET_ERRORS.ASSET_NOT_FOUND);
    }

    // Check asset_code uniqueness if changed
    if (updateAssetDto.asset_code && updateAssetDto.asset_code !== existingAsset.asset_code) {
      const duplicateCode = await this.prisma.assets.findFirst({
        where: {
          asset_code: updateAssetDto.asset_code,
          id: { not: id },
          deleted_at: null,
        },
      });

      if (duplicateCode) {
        throw new BadRequestException(ASSET_ERRORS.SERIAL_NUMBER_EXISTS);
      }
    }

    // Check serial_number uniqueness if changed
    if (updateAssetDto.serial_number && updateAssetDto.serial_number !== existingAsset.serial_number) {
      const duplicateSerial = await this.prisma.assets.findFirst({
        where: {
          serial_number: updateAssetDto.serial_number,
          id: { not: id },
          deleted_at: null,
        },
      });

      if (duplicateSerial) {
        throw new BadRequestException(ASSET_ERRORS.SERIAL_NUMBER_EXISTS);
      }
    }

    // Validate assigned_to if provided
    if (updateAssetDto.assigned_to) {
      const user = await this.prisma.users.findFirst({
        where: { id: updateAssetDto.assigned_to, deleted_at: null },
      });

      if (!user) {
        throw new BadRequestException(ASSET_ERRORS.ASSET_NOT_FOUND);
      }

      // Auto set assigned_date if assigning to someone
      if (!updateAssetDto.assigned_date) {
        updateAssetDto.assigned_date = new Date().toISOString().split('T')[0];
      }

      // Auto set status to ASSIGNED if not specified
      if (!updateAssetDto.status) {
        updateAssetDto.status = 'ASSIGNED';
      }
    }

    const updateData: any = {
      ...updateAssetDto,
      updated_at: new Date(),
    };

    if (updateAssetDto.purchase_date) {
      updateData.purchase_date = new Date(updateAssetDto.purchase_date);
    }
    if (updateAssetDto.warranty_end_date) {
      updateData.warranty_end_date = new Date(updateAssetDto.warranty_end_date);
    }
    if (updateAssetDto.assigned_date) {
      updateData.assigned_date = new Date(updateAssetDto.assigned_date);
    }

    const updatedAsset = await this.prisma.assets.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
        assigned_user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Log activity
    await this.activityLogService.logCrudOperation(
      'Asset',
      id,
      'updated',
      updatedBy,
      {
        changes: updateAssetDto,
        asset_code: updatedAsset.asset_code,
      }
    );

    return {
      message: SUCCESS_MESSAGES.UPDATED_SUCCESSFULLY,
      data: updatedAsset,
    };
  }

  async removeAsset(id: number, deletedBy: number) {
    const asset = await this.prisma.assets.findFirst({
      where: { id, deleted_at: null },
    });

    if (!asset) {
      throw new NotFoundException(ASSET_ERRORS.ASSET_NOT_FOUND);
    }

    // Check if asset is assigned
    if (asset.status === 'ASSIGNED' && asset.assigned_to) {
      throw new BadRequestException(ASSET_ERRORS.CANNOT_DELETE_ASSIGNED_ASSET);
    }

    // Check if there are pending requests for this asset
    const pendingRequests = await this.prisma.asset_requests.count({
      where: {
        asset_id: id,
        status: { in: ['PENDING', 'APPROVED'] },
        deleted_at: null,
      },
    });

    if (pendingRequests > 0) {
      throw new BadRequestException(ASSET_ERRORS.REQUEST_ALREADY_PROCESSED);
    }

    await this.prisma.assets.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    // Log activity
    await this.activityLogService.logCrudOperation(
      'Asset',
      id,
      'deleted',
      deletedBy,
      {
        asset_code: asset.asset_code,
        name: asset.name,
      }
    );

    return {
      message: SUCCESS_MESSAGES.DELETED_SUCCESSFULLY,
    };
  }

  // ===== ASSET ASSIGNMENT =====

  async assignAsset(assetId: number, userId: number, assignedBy: number, notes?: string) {
    const asset = await this.prisma.assets.findFirst({
      where: { id: assetId, deleted_at: null },
    });

    if (!asset) {
      throw new NotFoundException(ASSET_ERRORS.ASSET_NOT_FOUND);
    }

    if (asset.status !== ASSET_STATUSES.AVAILABLE) {
      throw new BadRequestException('Tài sản không ở trạng thái có sẵn');
    }

    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    const updatedAsset = await this.prisma.assets.update({
      where: { id: assetId },
      data: {
        status: ASSET_STATUSES.ASSIGNED,
        assigned_to: userId,
        assigned_date: new Date(),
        notes: notes || asset.notes,
        updated_at: new Date(),
      },
      include: {
        assigned_user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Log activity
    await this.activityLogService.log({
      logName: 'Asset Management',
      description: `Gán tài sản ${asset.name} cho user`,
      subjectType: 'Asset',
      event: 'asset.assigned',
      subjectId: assetId,
      causerId: assignedBy,
      properties: {
        asset_code: asset.asset_code,
        asset_name: asset.name,
        assigned_to_user_id: userId,
        assigned_to_user_name: updatedAsset.assigned_user?.user_information?.name,
        notes,
      },
    });

    return {
      message: 'Gán tài sản thành công',
      data: updatedAsset,
    };
  }

  async unassignAsset(assetId: number, unassignedBy: number, notes?: string) {
    const asset = await this.prisma.assets.findFirst({
      where: { id: assetId, deleted_at: null },
      include: {
        assigned_user: {
          select: {
            id: true,
            user_information: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(ASSET_ERRORS.ASSET_NOT_FOUND);
    }

    if (asset.status !== 'ASSIGNED') {
      throw new BadRequestException('Tài sản không ở trạng thái đã gán');
    }

    const updatedAsset = await this.prisma.assets.update({
      where: { id: assetId },
      data: {
        status: 'AVAILABLE',
        assigned_to: null,
        assigned_date: null,
        notes: notes || asset.notes,
        updated_at: new Date(),
      },
    });

    // Log activity
    await this.activityLogService.log({
      logName: 'Asset Management',
      description: `Thu hồi tài sản ${asset.name} từ user`,
      subjectType: 'Asset',
      event: 'asset.unassigned',
      subjectId: assetId,
      causerId: unassignedBy,
      properties: {
        asset_code: asset.asset_code,
        asset_name: asset.name,
        previous_assigned_user_id: asset.assigned_to,
        previous_assigned_user_name: asset.assigned_user?.user_information?.name,
        notes,
      },
    });

    return {
      message: 'Thu hồi tài sản thành công',
      data: updatedAsset,
    };
  }

  // ===== USER DEVICES FROM ASSETS =====

  async getUserDevices(userId: number) {
    const devices = await this.prisma.assets.findMany({
      where: {
        assigned_to: userId,
        status: ASSET_STATUSES.ASSIGNED,
        deleted_at: null,
          category: { in: DEVICE_CATEGORIES as any },
      },
      select: {
        id: true,
        name: true,
        asset_code: true,
        category: true,
        brand: true,
        model: true,
        serial_number: true,
        assigned_date: true,
        notes: true,
        purchase_date: true,
        warranty_end_date: true,
        location: true,
      },
      orderBy: {
        assigned_date: 'desc',
      },
    });

    return {
      data: devices,
    };
  }

  // ===== ASSET REQUESTS FOR USERS =====

  async createAssetRequest(createAssetRequestDto: CreateAssetRequestDto) {
    // Validate asset if specified
    if (createAssetRequestDto.asset_id) {
      const asset = await this.prisma.assets.findFirst({
        where: { id: createAssetRequestDto.asset_id, deleted_at: null },
      });

      if (!asset) {
        throw new BadRequestException('Tài sản không tồn tại');
      }
    }

    const createData: any = {
      user_id: createAssetRequestDto.user_id!,
      request_type: createAssetRequestDto.request_type,
      category: createAssetRequestDto.category,
      description: createAssetRequestDto.description,
      justification: createAssetRequestDto.justification,
      priority: createAssetRequestDto.priority || 'NORMAL',
      expected_date: createAssetRequestDto.expected_date ? new Date(createAssetRequestDto.expected_date) : null,
    };

    if (createAssetRequestDto.asset_id) {
      createData.asset_id = createAssetRequestDto.asset_id;
    }
    if (createAssetRequestDto.notes) {
      createData.notes = createAssetRequestDto.notes;
    }

    const request = await this.prisma.asset_requests.create({
      data: createData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
        asset: {
          select: {
            id: true,
            name: true,
            asset_code: true,
          },
        },
      },
    });

    // Log activity
    await this.activityLogService.log({
      logName: 'Asset Request',
      description: `Tạo request ${createAssetRequestDto.request_type} tài sản`,
      subjectType: 'Request',
      event: 'asset_request.created',
      subjectId: request.id,
      causerId: createAssetRequestDto.user_id!,
      properties: {
        request_type: request.request_type,
        category: request.category,
        priority: request.priority,
        asset_id: request.asset_id,
      },
    });

    return {
      message: 'Tạo request tài sản thành công',
      data: request,
    };
  }

  async findAllAssetRequests(paginationDto: AssetRequestPaginationDto = {}) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: any = {
      deleted_at: null,
    };

    // Build search conditions
    if (paginationDto.search) {
      whereConditions.OR = [
        { description: { contains: paginationDto.search, mode: 'insensitive' } },
        { justification: { contains: paginationDto.search, mode: 'insensitive' } },
        { category: { contains: paginationDto.search, mode: 'insensitive' } },
      ];
    }

    if (paginationDto.status) whereConditions.status = paginationDto.status;
    if (paginationDto.request_type) whereConditions.request_type = paginationDto.request_type;
    if (paginationDto.category) whereConditions.category = paginationDto.category;
    if (paginationDto.priority) whereConditions.priority = paginationDto.priority;
    if (paginationDto.user_id) whereConditions.user_id = paginationDto.user_id;
    if (paginationDto.approved_by) whereConditions.approved_by = paginationDto.approved_by;

    const [requests, total] = await Promise.all([
      this.prisma.asset_requests.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy: orderBy || { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: { name: true },
              },
            },
          },
          asset: {
            select: {
              id: true,
              name: true,
              asset_code: true,
              status: true,
            },
          },
          approver: {
            select: {
              id: true,
              email: true,
              user_information: {
                select: { name: true },
              },
            },
          },
        },
      }),
      this.prisma.asset_requests.count({ where: whereConditions }),
    ]);

    return buildPaginationResponse(
      requests,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findOneAssetRequest(id: number) {
    const request = await this.prisma.asset_requests.findFirst({
      where: { id, deleted_at: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
        asset: {
          select: {
            id: true,
            name: true,
            asset_code: true,
            status: true,
            category: true,
            brand: true,
            model: true,
          },
        },
        approver: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy request');
    }

    return {
      data: request,
    };
  }

  // ===== ASSET REQUEST APPROVAL FOR HR =====

  async approveAssetRequest(
    requestId: number,
    approveDto: ApproveAssetRequestDto,
    approverId: number,
  ) {
    const request = await this.prisma.asset_requests.findFirst({
      where: { id: requestId, deleted_at: null },
      include: {
        user: {
          select: {
            id: true,
            user_information: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request đã được xử lý');
    }

    if (approveDto.action === 'APPROVE') {
      // Validate asset if provided
      if (approveDto.asset_id) {
        const asset = await this.prisma.assets.findFirst({
          where: { id: approveDto.asset_id, deleted_at: null },
        });

        if (!asset) {
          throw new BadRequestException('Tài sản không tồn tại');
        }

        if (asset.status !== ASSET_STATUSES.AVAILABLE) {
          throw new BadRequestException('Tài sản không ở trạng thái có sẵn');
        }
      }

      const updatedRequest = await this.prisma.asset_requests.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approved_by: approverId,
          approved_at: new Date(),
          asset_id: approveDto.asset_id,
          notes: approveDto.notes,
          updated_at: new Date(),
        },
      });

      // Log activity
      await this.activityLogService.log({
        logName: 'Asset Request',
        description: `Phê duyệt request tài sản`,
        subjectType: 'Request',
        event: 'asset_request.approved',
        subjectId: requestId,
        causerId: approverId,
        properties: {
          request_type: request.request_type,
          category: request.category,
          user_id: request.user_id,
          user_name: request.user?.user_information?.name,
          asset_id: approveDto.asset_id,
          notes: approveDto.notes,
        },
      });

      return {
        message: 'Phê duyệt request thành công',
        data: updatedRequest,
      };
    } else {
      // REJECT
      const updatedRequest = await this.prisma.asset_requests.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          approved_by: approverId,
          approved_at: new Date(),
          rejection_reason: approveDto.rejection_reason,
          notes: approveDto.notes,
          updated_at: new Date(),
        },
      });

      // Log activity
      await this.activityLogService.log({
        logName: 'Asset Request',
        description: `Từ chối request tài sản`,
        subjectType: 'Request',
        event: 'asset_request.rejected',
        subjectId: requestId,
        causerId: approverId,
        properties: {
          request_type: request.request_type,
          category: request.category,
          user_id: request.user_id,
          user_name: request.user?.user_information?.name,
          rejection_reason: approveDto.rejection_reason,
          notes: approveDto.notes,
        },
      });

      return {
        message: 'Từ chối request thành công',
        data: updatedRequest,
      };
    }
  }

  async fulfillAssetRequest(
    requestId: number,
    fulfillDto: FulfillAssetRequestDto,
    fulfilledBy: number,
  ) {
    const request = await this.prisma.asset_requests.findFirst({
      where: { id: requestId, deleted_at: null },
      include: {
        user: {
          select: {
            id: true,
            user_information: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy request');
    }

    if (request.status !== 'APPROVED') {
      throw new BadRequestException('Request chưa được phê duyệt');
    }

    const asset = await this.prisma.assets.findFirst({
      where: { id: fulfillDto.asset_id, deleted_at: null },
    });

    if (!asset) {
      throw new BadRequestException('Tài sản không tồn tại');
    }

    if (asset.status !== ASSET_STATUSES.AVAILABLE) {
      throw new BadRequestException('Tài sản không ở trạng thái có sẵn');
    }

    // Use transaction to ensure consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // Update request status
      const updatedRequest = await tx.asset_requests.update({
        where: { id: requestId },
        data: {
          status: 'FULFILLED',
          asset_id: fulfillDto.asset_id,
          fulfilled_at: new Date(),
          notes: fulfillDto.notes,
          updated_at: new Date(),
        },
      });

      // Assign asset to user
      await tx.assets.update({
        where: { id: fulfillDto.asset_id },
        data: {
          status: ASSET_STATUSES.ASSIGNED,
          assigned_to: request.user_id,
          assigned_date: new Date(),
          updated_at: new Date(),
        },
      });

      return updatedRequest;
    });

    // Log activity
    await this.activityLogService.log({
      logName: 'Asset Request',
      description: `Giao tài sản cho user theo request`,
      subjectType: 'Request',
      event: 'asset_request.fulfilled',
      subjectId: requestId,
      causerId: fulfilledBy,
      properties: {
        request_type: request.request_type,
        category: request.category,
        user_id: request.user_id,
        user_name: request.user?.user_information?.name,
        asset_id: fulfillDto.asset_id,
        asset_code: asset.asset_code,
        asset_name: asset.name,
        notes: fulfillDto.notes,
      },
    });

    return {
      message: 'Giao tài sản thành công',
      data: result,
    };
  }

  // ===== STATISTICS =====

  async getAssetStatistics() {
    const [
      totalAssets,
      availableAssets,
      assignedAssets,
      maintenanceAssets,
      pendingRequests,
      approvedRequests,
      categoryStats,
    ] = await Promise.all([
      this.prisma.assets.count({ where: { deleted_at: null } }),
      this.prisma.assets.count({ where: { status: 'AVAILABLE', deleted_at: null } }),
      this.prisma.assets.count({ where: { status: 'ASSIGNED', deleted_at: null } }),
      this.prisma.assets.count({ where: { status: 'MAINTENANCE', deleted_at: null } }),
      this.prisma.asset_requests.count({ where: { status: 'PENDING', deleted_at: null } }),
      this.prisma.asset_requests.count({ where: { status: 'APPROVED', deleted_at: null } }),
      this.prisma.assets.groupBy({
        by: ['category'],
        where: { deleted_at: null },
        _count: { category: true },
      }),
    ]);

    return {
      assets: {
        total: totalAssets,
        available: availableAssets,
        assigned: assignedAssets,
        maintenance: maintenanceAssets,
        utilization_rate: totalAssets > 0 ? Math.round((assignedAssets / totalAssets) * 100) : 0,
      },
      requests: {
        pending: pendingRequests,
        approved: approvedRequests,
      },
      categories: categoryStats.map(stat => ({
        category: stat.category,
        count: stat._count.category,
      })),
    };
  }
}
