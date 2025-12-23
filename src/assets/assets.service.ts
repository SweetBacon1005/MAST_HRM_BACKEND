import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, AssetRequestStatus, AssetStatus, Prisma } from '@prisma/client';
import {
  ASSET_ERRORS,
  SUCCESS_MESSAGES,
  USER_ERRORS,
} from '../common/constants/error-messages.constants';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { PrismaService } from '../database/prisma.service';
import {
  CreateAssetRequestDto,
  FulfillAssetRequestDto,
  ReviewAssetRequestDto,
  UpdateAssetRequestDto,
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
  ) {}

  async createAsset(createAssetDto: CreateAssetDto, createdBy: number) {
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
        name: createAssetDto.name,
        description: createAssetDto.description,
        asset_code: createAssetDto.asset_code,
        category: createAssetDto.category,
        brand: createAssetDto.brand,
        model: createAssetDto.model,
        serial_number: createAssetDto.serial_number,
        purchase_date: createAssetDto.purchase_date
          ? new Date(createAssetDto.purchase_date)
          : null,
        purchase_price: createAssetDto.purchase_price
          ? parseFloat(createAssetDto.purchase_price)
          : null,
        warranty_end_date: createAssetDto.warranty_end_date
          ? new Date(createAssetDto.warranty_end_date)
          : null,
        location: createAssetDto.location,
        status: createAssetDto.status,
        notes: createAssetDto.notes,
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

    return {
      message: SUCCESS_MESSAGES.CREATED_SUCCESSFULLY,
      data: asset,
    };
  }

  async findAllAssets(paginationDto: AssetPaginationDto = {}) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);

    const whereConditions: Prisma.assetsWhereInput = {
      deleted_at: null,
    };

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
      whereConditions.category = paginationDto.category as any;
    if (paginationDto.status)
      whereConditions.status = paginationDto.status as any;
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

    if (updateAssetDto.assigned_to) {
      const user = await this.prisma.users.findFirst({
        where: { id: updateAssetDto.assigned_to, deleted_at: null },
      });

      if (!user) {
        throw new BadRequestException(ASSET_ERRORS.ASSET_NOT_FOUND);
      }

      if (!updateAssetDto.assigned_date) {
        updateAssetDto.assigned_date = new Date().toISOString().split('T')[0];
      }

      if (!updateAssetDto.status) {
        updateAssetDto.status = 'ASSIGNED';
      }
    }

    const updateData: Prisma.assetsUpdateInput = {
      name: updateAssetDto.name,
      description: updateAssetDto.description,
      asset_code: updateAssetDto.asset_code,
      category: updateAssetDto.category,
      brand: updateAssetDto.brand,
      model: updateAssetDto.model,
      serial_number: updateAssetDto.serial_number,
      purchase_date: updateAssetDto.purchase_date
        ? new Date(updateAssetDto.purchase_date)
        : undefined,
      purchase_price:
        updateAssetDto.purchase_price !== undefined
          ? updateAssetDto.purchase_price
            ? parseFloat(updateAssetDto.purchase_price)
            : null
          : undefined,
      warranty_end_date: updateAssetDto.warranty_end_date
        ? new Date(updateAssetDto.warranty_end_date)
        : undefined,
      location: updateAssetDto.location,
      status: updateAssetDto.status,
      assigned_user: updateAssetDto.assigned_to
        ? { connect: { id: updateAssetDto.assigned_to } }
        : undefined,
      assigned_date: updateAssetDto.assigned_date
        ? new Date(updateAssetDto.assigned_date)
        : undefined,
      notes: updateAssetDto.notes,
      updated_at: new Date(),
    };

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

    if (asset.status === 'ASSIGNED' && asset.assigned_to) {
      throw new BadRequestException(ASSET_ERRORS.CANNOT_DELETE_ASSIGNED_ASSET);
    }

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

    return {
      message: SUCCESS_MESSAGES.DELETED_SUCCESSFULLY,
    };
  }

  async assignAsset(
    assetId: number,
    user_id: number,
    assignedBy: number,
    notes?: string,
  ) {
    const asset = await this.prisma.assets.findFirst({
      where: { id: assetId, deleted_at: null },
    });

    if (!asset) {
      throw new NotFoundException(ASSET_ERRORS.ASSET_NOT_FOUND);
    }

    if (asset.status !== AssetStatus.AVAILABLE) {
      throw new BadRequestException(ASSET_ERRORS.ASSET_NOT_AVAILABLE);
    }

    const user = await this.prisma.users.findFirst({
      where: { id: user_id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(USER_ERRORS.USER_NOT_FOUND);
    }

    const updatedAsset = await this.prisma.assets.update({
      where: { id: assetId },
      data: {
        status: AssetStatus.ASSIGNED,
        assigned_to: user_id,
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
      throw new BadRequestException(ASSET_ERRORS.ASSET_NOT_ASSIGNED_STATUS);
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

    return {
      message: 'Thu hồi tài sản thành công',
      data: updatedAsset,
    };
  }

  async getUserDevices(user_id: number) {
    const devices = await this.prisma.assets.findMany({
      where: {
        assigned_to: user_id,
        status: AssetStatus.ASSIGNED,
        deleted_at: null,
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
        throw new BadRequestException(ASSET_ERRORS.ASSET_DOES_NOT_EXIST);
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
    user_id: number,
    paginationDto: AssetRequestPaginationDto = {},
  ) {
    const effectiveDto: AssetRequestPaginationDto = {
      ...paginationDto,
      user_id: user_id,
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
      throw new NotFoundException(ASSET_ERRORS.ASSET_REQUEST_NOT_FOUND);
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
      throw new NotFoundException(ASSET_ERRORS.ASSET_REQUEST_NOT_FOUND);
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(ASSET_ERRORS.REQUEST_ALREADY_PROCESSED);
    }

    if (reviewDto.status === ApprovalStatus.APPROVED) {
      if (reviewDto.asset_id) {
        const asset = await this.prisma.assets.findFirst({
          where: { id: reviewDto.asset_id, deleted_at: null },
        });

        if (!asset) {
          throw new BadRequestException(ASSET_ERRORS.ASSET_DOES_NOT_EXIST);
        }

        if (asset.status !== AssetStatus.AVAILABLE) {
          throw new BadRequestException(ASSET_ERRORS.ASSET_NOT_AVAILABLE);
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

      return {
        message: 'Phê duyệt request thành công',
        data: updatedRequest,
      };
    } else {
      const updatedRequest = await this.prisma.asset_requests.update({
        where: { id: requestId },
        data: {
          status: ApprovalStatus.REJECTED,
          approved_by: reviewBy,
          approved_at: new Date(),
          notes: reviewDto.notes,
          rejected_reason: reviewDto.rejected_reason,
          updated_at: new Date(),
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
      throw new NotFoundException(ASSET_ERRORS.ASSET_REQUEST_NOT_FOUND);
    }

    if (request.status !== 'APPROVED') {
      throw new BadRequestException(ASSET_ERRORS.REQUEST_NOT_APPROVED);
    }

    const asset = await this.prisma.assets.findFirst({
      where: { id: fulfillDto.asset_id, deleted_at: null },
    });

    if (!asset) {
      throw new BadRequestException(ASSET_ERRORS.ASSET_DOES_NOT_EXIST);
    }

    if (asset.status !== AssetStatus.AVAILABLE) {
      throw new BadRequestException(ASSET_ERRORS.ASSET_NOT_AVAILABLE);
    }

    const result = await this.prisma.$transaction(async (tx) => {
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

      await tx.assets.update({
        where: { id: fulfillDto.asset_id },
        data: {
          status: AssetStatus.ASSIGNED,
          assigned_to: request.user_id,
          assigned_date: new Date(),
          updated_at: new Date(),
        },
      });

      return updatedRequest;
    });

    return {
      message: 'Giao tài sản thành công',
      data: result,
    };
  }

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

  async updateAssetRequest(
    requestId: number,
    updateDto: UpdateAssetRequestDto,
    user_id: number,
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
      throw new NotFoundException(ASSET_ERRORS.ASSET_REQUEST_NOT_FOUND);
    }

    if (request.user_id !== user_id) {
      throw new BadRequestException(ASSET_ERRORS.CANNOT_UPDATE_REQUEST);
    }

    if (request.status !== AssetRequestStatus.PENDING) {
      throw new BadRequestException(ASSET_ERRORS.CANNOT_UPDATE_REQUEST_STATUS);
    }

    if (updateDto.asset_id) {
      const asset = await this.prisma.assets.findFirst({
        where: { id: updateDto.asset_id, deleted_at: null },
      });

      if (!asset) {
        throw new BadRequestException(ASSET_ERRORS.ASSET_DOES_NOT_EXIST);
      }
    }

    const updateData: Prisma.asset_requestsUpdateInput = {
      request_type: updateDto.request_type,
      category: updateDto.category,
      description: updateDto.description,
      justification: updateDto.justification,
      expected_date: updateDto.expected_date
        ? new Date(updateDto.expected_date)
        : undefined,
      asset: updateDto.asset_id
        ? { connect: { id: updateDto.asset_id } }
        : undefined,
      notes: updateDto.notes,
    };

    const updatedRequest = await this.prisma.asset_requests.update({
      where: { id: requestId },
      data: updateData,
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

    return {
      message: 'Cập nhật request tài sản thành công',
      data: updatedRequest,
    };
  }

  async deleteAssetRequest(requestId: number, user_id: number) {
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
      throw new NotFoundException(ASSET_ERRORS.ASSET_REQUEST_NOT_FOUND);
    }

    if (request.user_id !== user_id) {
      throw new BadRequestException(ASSET_ERRORS.CANNOT_DELETE_REQUEST);
    }

    if (
      ![AssetRequestStatus.PENDING, AssetRequestStatus.CANCELLED].includes(
        request.status as any,
      )
    ) {
      throw new BadRequestException(ASSET_ERRORS.CANNOT_DELETE_REQUEST_STATUS);
    }

    await this.prisma.asset_requests.update({
      where: { id: requestId },
      data: { deleted_at: new Date() },
    });

    return {
      message: 'Xóa request tài sản thành công',
    };
  }
}
