import { Injectable } from '@nestjs/common';
import { DayOffDuration, RemoteType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RemoteWorkDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async createRemoteWorkDetail(data: {
    request_id: number;
    remote_type: RemoteType;
    duration: DayOffDuration;
  }) {
    return this.prisma.remote_work_requests.create({
      data,
    });
  }

  async update(
    id: number,
    data: Partial<{
      remote_type: RemoteType;
      duration: DayOffDuration;
    }>,
  ) {
    return this.prisma.remote_work_requests.update({
      where: { id },
      data,
    });
  }

  async updateRemoteWorkDetail(
    request_id: number,
    data: Partial<{
      remote_type: RemoteType;
      duration: DayOffDuration;
    }>,
  ) {
    return this.prisma.remote_work_requests.update({
      where: { request_id },
      data,
    });
  }

  async findRemoteWorkByRequestId(request_id: number) {
    return this.prisma.remote_work_requests.findUnique({
      where: { request_id },
    });
  }
}
