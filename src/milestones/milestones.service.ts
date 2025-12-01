import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { MILESTONE_ERRORS, PROJECT_ERRORS } from '../common/constants/error-messages.constants';
import {
  buildPaginationQuery,
  buildPaginationResponse,
} from '../common/utils/pagination.util';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestonePaginationDto } from './dto/milestone-pagination.dto';

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: number, createMilestoneDto: CreateMilestoneDto) {
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId, deleted_at: null },
    });

    if (!project) {
      throw new NotFoundException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    const { start_date, end_date, ...rest } = createMilestoneDto;
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      throw new BadRequestException(MILESTONE_ERRORS.INVALID_DATE_RANGE);
    }

    if (startDate < project.start_date || endDate > project.end_date) {
      throw new BadRequestException(MILESTONE_ERRORS.OUT_OF_PROJECT_RANGE);
    }

    const existingMilestone = await this.prisma.project_milestones.findFirst({
      where: {
        project_id: projectId,
        name: createMilestoneDto.name,
        deleted_at: null,
      },
    });

    if (existingMilestone) {
      throw new BadRequestException(MILESTONE_ERRORS.MILESTONE_NAME_EXISTS);
    }

    const createData: Prisma.project_milestonesCreateInput = {
      project: { connect: { id: projectId } },
      name: rest.name,
      description: rest.description,
      start_date: startDate,
      end_date: endDate,
      status: createMilestoneDto.status,
      progress: createMilestoneDto.progress ?? 0,
      order: createMilestoneDto.order ?? 0,
    };

    return await this.prisma.project_milestones.create({
      data: createData,
      include: {
        project: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async findAll(paginationDto: MilestonePaginationDto) {
    const { skip, take, orderBy } = buildPaginationQuery(paginationDto);
    const where: Prisma.project_milestonesWhereInput = { deleted_at: null };

    if (paginationDto.project_id) {
      where.project_id = paginationDto.project_id;
    }

    if (paginationDto.status) {
      where.status = paginationDto.status;
    }

    if (paginationDto.search) {
      where.OR = [
        { name: { contains: paginationDto.search } },
        { description: { contains: paginationDto.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.project_milestones.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || [
          { project_id: 'asc' },
          { order: 'asc' },
          { start_date: 'asc' },
        ],
        include: {
          project: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      this.prisma.project_milestones.count({ where }),
    ]);

    const transformedData = data.map((milestone) => ({
      ...milestone,
      start_date: milestone.start_date.toISOString().split('T')[0],
      end_date: milestone.end_date.toISOString().split('T')[0],
    }));

    return buildPaginationResponse(
      transformedData,
      total,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );
  }

  async findAllByProject(projectId: number) {
    const project = await this.prisma.projects.findUnique({
      where: { id: projectId, deleted_at: null },
    });

    if (!project) {
      throw new NotFoundException(PROJECT_ERRORS.PROJECT_NOT_FOUND);
    }

    const milestones = await this.prisma.project_milestones.findMany({
      where: {
        project_id: projectId,
        deleted_at: null,
      },
      orderBy: [{ order: 'asc' }, { start_date: 'asc' }],
    });

    return milestones.map((milestone) => ({
      ...milestone,
      start_date: milestone.start_date.toISOString().split('T')[0],
      end_date: milestone.end_date.toISOString().split('T')[0],
    }));
  }

  async findOne(id: number) {
    const milestone = await this.prisma.project_milestones.findUnique({
      where: { id, deleted_at: null },
      include: {
        project: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException(MILESTONE_ERRORS.MILESTONE_NOT_FOUND);
    }

    return {
      ...milestone,
      start_date: milestone.start_date.toISOString().split('T')[0],
      end_date: milestone.end_date.toISOString().split('T')[0],
    };
  }

  async update(id: number, updateMilestoneDto: UpdateMilestoneDto) {
    const milestone = await this.prisma.project_milestones.findUnique({
      where: { id, deleted_at: null },
      include: { project: true },
    });

    if (!milestone) {
      throw new NotFoundException(MILESTONE_ERRORS.MILESTONE_NOT_FOUND);
    }

    if (updateMilestoneDto.name && updateMilestoneDto.name !== milestone.name) {
      const existingMilestone = await this.prisma.project_milestones.findFirst({
        where: {
          project_id: milestone.project_id,
          name: updateMilestoneDto.name,
          deleted_at: null,
          id: { not: id },
        },
      });

      if (existingMilestone) {
        throw new BadRequestException(MILESTONE_ERRORS.MILESTONE_NAME_EXISTS);
      }
    }

    const { start_date, end_date, ...rest } = updateMilestoneDto;
    const updateData: Prisma.project_milestonesUpdateInput = { ...rest };

    if (start_date) {
      updateData.start_date = new Date(start_date);
    }

    if (end_date) {
      updateData.end_date = new Date(end_date);
    }

    const finalStartDate = start_date ? new Date(start_date) : milestone.start_date;
    const finalEndDate = end_date ? new Date(end_date) : milestone.end_date;

    if (finalStartDate >= finalEndDate) {
      throw new BadRequestException(MILESTONE_ERRORS.INVALID_DATE_RANGE);
    }

    if (
      finalStartDate < milestone.project.start_date ||
      finalEndDate > milestone.project.end_date
    ) {
      throw new BadRequestException(MILESTONE_ERRORS.OUT_OF_PROJECT_RANGE);
    }

    return await this.prisma.project_milestones.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async updateProgress(id: number, progress: number) {
    const milestone = await this.prisma.project_milestones.findUnique({
      where: { id, deleted_at: null },
    });

    if (!milestone) {
      throw new NotFoundException(MILESTONE_ERRORS.MILESTONE_NOT_FOUND);
    }

    if (progress < 0 || progress > 100) {
      throw new BadRequestException(MILESTONE_ERRORS.INVALID_PROGRESS);
    }

    return await this.prisma.project_milestones.update({
      where: { id },
      data: { progress },
      include: {
        project: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async remove(id: number) {
    const milestone = await this.prisma.project_milestones.findUnique({
      where: { id, deleted_at: null },
    });

    if (!milestone) {
      throw new NotFoundException(MILESTONE_ERRORS.MILESTONE_NOT_FOUND);
    }

    return await this.prisma.project_milestones.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async calculateProjectProgress(projectId: number): Promise<number> {
    const milestones = await this.prisma.project_milestones.findMany({
      where: {
        project_id: projectId,
        deleted_at: null,
      },
      select: { progress: true },
    });

    if (milestones.length === 0) {
      return 0;
    }

    const totalProgress = milestones.reduce((sum, m) => sum + m.progress, 0);
    return Math.round(totalProgress / milestones.length);
  }
}
