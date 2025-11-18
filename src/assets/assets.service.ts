import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, Prisma } from '@prisma/client';
import {
  ASSET_ERRORS,
  SUCCESS_MESSAGES,
} from '../common/constants/error-messages.constants';
import { ActivityLogService } from '../common/services/activity-log.service';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import { ASSET_STATUSES, DEVICE_CATEGORIES } from './constants/asset.constants';
import {
  CreateAssetRequestDto,
  FulfillAssetRequestDto,
  ReviewAssetRequestDto,
} from './dto/asset-request.dto';
import { CreateAssetDto } from './dto/create-asset.dto';
import {
  AssetPaginationDto,
  AssetRequestPaginationDto,
} from './dto/pagination-queries.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

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
      throw new BadRequestException(ASSET_ERRORS.ASSET_CODE_EXISTS);
    }

    const asset = await this.prisma.assets.create({
      data: {
        ...createAssetDto,
        category: createAssetDto.category as any,
        purchase_date: createAssetDto.purchase_date
          ? new Date(createAssetDto.purchase_date)
          : null,
        purchase_price: createAssetDto.purchase_price
          ? parseFloat(createAssetDto.purchase_price)
          : null,
        warranty_end_date: createAssetDto.warranty_end_date
          ? new Date(createAssetDto.warranty_end_date)
          : null,
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
      },
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
        { name: { contains: paginationDto.search } },
        { asset_code: { contains: paginationDto.search } },
        { description: { contains: paginationDto.search } },
        { brand: { contains: paginationDto.search } },
        { model: { contains: paginationDto.search } },
      ];
    }

    if (paginationDto.category)
      whereConditions.category = paginationDto.category;
    if (paginationDto.status) whereConditions.status = paginationDto.status;
    if (paginationDto.assigned_to)
      whereConditions.assigned_to = paginationDto.assigned_to;
    if (paginationDto.brand)
      whereConditions.brand = { contains: paginationDto.brand };

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

  async updateAsset(
    id: number,
    updateAssetDto: UpdateAssetDto,
    updatedBy: number,
  ) {
    const existingAsset = await this.prisma.assets.findFirst({
      where: { id, deleted_at: null },
    });

    if (!existingAsset) {
      throw new NotFoundException(ASSET_ERRORS.ASSET_NOT_FOUND);
    }

    // Check asset_code uniqueness if changed
    if (
      updateAssetDto.asset_code &&
      updateAssetDto.asset_code !== existingAsset.asset_code
    ) {
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
    if (
      updateAssetDto.serial_number &&
      updateAssetDto.serial_number !== existingAsset.serial_number
    ) {
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
    if (updateAssetDto.purchase_price !== undefined) {
      updateData.purchase_price = updateAssetDto.purchase_price
        ? parseFloat(updateAssetDto.purchase_price)
        : null;
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
      },
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
      },
    );

    return {
      message: SUCCESS_MESSAGES.DELETED_SUCCESSFULLY,
    };
  }

  // ===== ASSET ASSIGNMENT =====

  async assignAsset(
    assetId: number,
    userId: number,
    assignedBy: number,
    notes?: string,
  ) {
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
        assigned_to_user_name:
          updatedAsset.assigned_user?.user_information?.name,
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
        previous_assigned_user_name:
          asset.assigned_user?.user_information?.name,
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

  async createAssetRequest(createAssetRequestDto: CreateAssetRequestDto) {
    if (createAssetRequestDto.asset_id) {
      const asset = await this.prisma.assets.findFirst({
        where: { id: createAssetRequestDto.asset_id, deleted_at: null },
      });

      if (!asset) {
        throw new BadRequestException('Tài sản không tồn tại');
      }
    }

    const createData: Prisma.asset_requestsCreateInput = {
      user: {
        connect: {
          id: createAssetRequestDto.user_id!,
        },
      },
      request_type: createAssetRequestDto.request_type,
      category: createAssetRequestDto.category,
      description: createAssetRequestDto.description,
      justification: createAssetRequestDto.justification,
      expected_date: createAssetRequestDto.expected_date
        ? new Date(createAssetRequestDto.expected_date)
        : null,
    };

    if (createAssetRequestDto.asset_id) {
      createData.asset = {
        connect: {
          id: createAssetRequestDto.asset_id,
        },
      };
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

    const whereConditions: Prisma.asset_requestsWhereInput = {
      deleted_at: null,
    };

    if (paginationDto.search) {
      whereConditions.OR = [
        { description: { contains: paginationDto.search } },
        { justification: { contains: paginationDto.search } },
        { category: paginationDto.category },
        { asset: { name: { contains: paginationDto.search } } },
        { asset: { asset_code: { contains: paginationDto.search } } },
        { asset: { brand: { contains: paginationDto.search } } },
        { asset: { model: { contains: paginationDto.search } } },
        { asset: { serial_number: { contains: paginationDto.search } } },
      ];
    }

    if (paginationDto.status) whereConditions.status = paginationDto.status;
    if (paginationDto.user_id) whereConditions.user_id = paginationDto.user_id;
    if (paginationDto.approved_by)
      whereConditions.approved_by = paginationDto.approved_by;


    const [requests, total] = await Promise.all([
      this.prisma.asset_requests.findMany({
        where: whereConditions,
        skip,
        take,
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

  async findMyAssetRequests(
    userId: number,
    paginationDto: AssetRequestPaginationDto = {},
  ) {
    const effectiveDto: AssetRequestPaginationDto = {
      ...paginationDto,
      user_id: userId,
    };
    return this.findAllAssetRequests(effectiveDto);
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

  async reviewAssetRequest(
    requestId: number,
    reviewDto: ReviewAssetRequestDto,
    reviewBy: number,
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

    if (reviewDto.status === ApprovalStatus.APPROVED) {
      if (reviewDto.asset_id) {
        const asset = await this.prisma.assets.findFirst({
          where: { id: reviewDto.asset_id, deleted_at: null },
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
          status: ApprovalStatus.APPROVED,
          approved_by: reviewBy,
          approved_at: new Date(),
          asset_id: reviewDto.asset_id,
          notes: reviewDto.notes,
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
        causerId: reviewBy,
        properties: {
          request_type: request.request_type,
          category: request.category,
          user_id: request.user_id,
          user_name: request.user?.user_information?.name,
          asset_id: reviewDto.asset_id,
          notes: reviewDto.notes,
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
          status: ApprovalStatus.REJECTED,
          approved_by: reviewBy,
          approved_at: new Date(),
          notes: reviewDto.notes,
          rejection_reason: reviewDto.rejection_reason,
          updated_at: new Date(),
        },
      });

      await this.activityLogService.log({
        logName: 'Asset Request',
        description: `Từ chối request tài sản`,
        subjectType: 'Request',
        event: 'asset_request.rejected',
        subjectId: requestId,
        causerId: reviewBy,
        properties: {
          request_type: request.request_type,
          category: request.category,
          user_id: request.user_id,
          user_name: request.user?.user_information?.name,
          notes: reviewDto.notes,
          rejection_reason: reviewDto.rejection_reason,
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
      this.prisma.assets.count({
        where: { status: 'AVAILABLE', deleted_at: null },
      }),
      this.prisma.assets.count({
        where: { status: 'ASSIGNED', deleted_at: null },
      }),
      this.prisma.assets.count({
        where: { status: 'MAINTENANCE', deleted_at: null },
      }),
      this.prisma.asset_requests.count({
        where: { status: 'PENDING', deleted_at: null },
      }),
      this.prisma.asset_requests.count({
        where: { status: 'APPROVED', deleted_at: null },
      }),
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
        utilization_rate:
          totalAssets > 0
            ? Math.round((assignedAssets / totalAssets) * 100)
            : 0,
      },
      requests: {
        pending: pendingRequests,
        approved: approvedRequests,
      },
      categories: categoryStats.map((stat) => ({
        category: stat.category,
        count: stat._count.category,
      })),
    };
  }
}
