import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ForgotCheckinDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async createForgotCheckinDetail(data: {
    request_id: number;
    checkin_time?: Date;
    checkout_time?: Date;
  }) {
    return this.prisma.forgot_checkin_requests.create({
      data: {
        request_id: data.request_id,
        checkin_time: data.checkin_time || null,
        checkout_time: data.checkout_time || null,
      },
    });
  }

  async updateForgotCheckinDetail(
    request_id: number,
    data: Partial<{
      checkin_time: Date | null;
      checkout_time: Date | null;
    }>,
  ) {
    return this.prisma.forgot_checkin_requests.update({
      where: { request_id },
      data,
    });
  }

  async findForgotCheckinByRequestId(request_id: number) {
    return this.prisma.forgot_checkin_requests.findUnique({
      where: { request_id },
    });
  }
}
