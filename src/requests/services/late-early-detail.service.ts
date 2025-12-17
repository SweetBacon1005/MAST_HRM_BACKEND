import { Injectable } from '@nestjs/common';
import { LateEarlyType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LateEarlyDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async createLateEarlyDetail(data: {
    request_id: number;
    request_type: LateEarlyType;
    late_minutes?: number;
    early_minutes?: number;
  }) {
    return this.prisma.late_early_requests.create({
      data,
    });
  }

  async update(
    id: number,
    data: Partial<{
      request_type: LateEarlyType;
      late_minutes: number | null;
      early_minutes: number | null;
    }>,
  ) {
    return this.prisma.late_early_requests.update({
      where: { id },
      data,
    });
  }

  async updateLateEarlyDetail(
    request_id: number,
    data: Partial<{
      request_type: LateEarlyType;
      late_minutes: number;
      early_minutes: number;
    }>,
  ) {
    return this.prisma.late_early_requests.update({
      where: { request_id },
      data,
    });
  }

  async findLateEarlyByRequestId(request_id: number) {
    return this.prisma.late_early_requests.findUnique({
      where: { request_id },
    });
  }
}
