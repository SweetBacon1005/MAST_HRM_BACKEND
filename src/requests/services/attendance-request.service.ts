import { Injectable } from '@nestjs/common';
import {
  ApprovalStatus,
  AttendanceRequestType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AttendanceRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async createAttendanceRequest(data: {
    user_id: number;
    timesheet_id: number;
    work_date: Date;
    request_type: AttendanceRequestType;
    title: string;
    reason?: string;
  }) {
    return this.prisma.attendance_requests.create({
      data: {
        ...data,
        status: ApprovalStatus.PENDING,
      },
    });
  }

  async findMany(where: Prisma.attendance_requestsWhereInput) {
    return this.prisma.attendance_requests.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: {
                name: true,
                code: true,
                avatar: true,
              },
            },
          },
        },
        approved_by_user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        timesheet: true,
        day_off: true,
        overtime: {
          include: {
            project: true,
          },
        },
        remote_work_request: true,
        late_early_request: true,
        forgot_checkin_request: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.attendance_requests.findFirst({
      where: { id, deleted_at: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: {
                name: true,
                code: true,
                avatar: true,
              },
            },
          },
        },
        approved_by_user: {
          select: {
            id: true,
            email: true,
            user_information: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        timesheet: true,
        day_off: true,
        overtime: {
          include: {
            project: true,
          },
        },
        remote_work_request: true,
        late_early_request: true,
        forgot_checkin_request: true,
      },
    });
  }

  async checkDuplicateRequest(
    user_id: number,
    work_date: Date,
    request_type: AttendanceRequestType,
  ): Promise<boolean> {
    const existing = await this.prisma.attendance_requests.findFirst({
      where: {
        user_id,
        work_date,
        request_type,
        deleted_at: null,
      },
    });
    return !!existing;
  }

  async approve(id: number, approved_by: number) {
    return this.prisma.attendance_requests.update({
      where: { id },
      data: {
        status: ApprovalStatus.APPROVED,
        approved_by,
        approved_at: new Date(),
      },
    });
  }

  async reject(id: number, approved_by: number, rejected_reason: string) {
    return this.prisma.attendance_requests.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        approved_by,
        approved_at: new Date(),
        rejected_reason,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.attendance_requests.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  async count(where: Prisma.attendance_requestsWhereInput): Promise<number> {
    return this.prisma.attendance_requests.count({ where });
  }

  async update(
    id: number,
    data: Partial<{
      work_date: Date;
      title: string;
      reason: string;
    }>,
  ) {
    return this.prisma.attendance_requests.update({
      where: { id },
      data,
    });
  }
}
