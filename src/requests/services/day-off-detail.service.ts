import { Injectable } from '@nestjs/common';
import { DayOffDuration, DayOffType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DayOffDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async createDayOffDetail(data: {
    request_id: number;
    duration: DayOffDuration;
    type: DayOffType;
  }) {
    return this.prisma.day_offs.create({
      data: {
        request_id: data.request_id,
        duration: data.duration,
        type: data.type,
      },
    });
  }

  async update(
    id: number,
    data: Partial<{
      duration: DayOffDuration;
      type: DayOffType;
    }>,
  ) {
    return this.prisma.day_offs.update({
      where: { id },
      data,
    });
  }

  async updateDayOffDetail(
    request_id: number,
    data: Partial<{
      duration: DayOffDuration;
      type: DayOffType;
    }>,
  ) {
    return this.prisma.day_offs.update({
      where: { request_id },
      data,
    });
  }

  async findDayOffByRequestId(request_id: number) {
    return this.prisma.day_offs.findUnique({
      where: { request_id },
    });
  }
}
