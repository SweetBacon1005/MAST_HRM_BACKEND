import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OvertimeDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async createOvertimeDetail(data: {
    request_id: number;
    start_time: Date;
    end_time: Date;
    project_id?: number;
  }) {
    return this.prisma.over_times_history.create({
      data,
    });
  }

  async updateOvertimeDetail(
    request_id: number,
    data: Partial<{
      start_time: Date;
      end_time: Date;
      project_id: number;
    }>,
  ) {
    return this.prisma.over_times_history.update({
      where: { request_id },
      data,
    });
  }

  async findOvertimeByRequestId(request_id: number) {
    return this.prisma.over_times_history.findUnique({
      where: { request_id },
    });
  }
}
