import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CsvExportService } from '../../common/services/csv-export.service';

@Injectable()
export class AttendanceExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly csvExport: CsvExportService,
  ) {}

  /**
   * Export attendance logs to CSV
   */
  async exportAttendanceLogs(
    startDate?: string,
    endDate?: string,
    divisionId?: number,
  ): Promise<string> {
    const where: any = {};

    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (divisionId) {
      where.user = {
        user_division: {
          some: {
            divisionId: divisionId,
          },
        },
      };
    }

    const logs = await this.prisma.attendance_logs.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            user_information: {
              select: {
                name: true,
              },
            },
            email: true,
            user_division: {
              include: {
                division: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    // Transform data for CSV
    const csvData = logs.map((log) => ({
      user_id: log.user_id,   
      email: log.user.email,
      name: log.user.user_information?.name || '',
      division: log.user.user_division?.[0]?.division?.name || '',
      work_date: this.csvExport.formatDate(log.work_date),
      timestamp: this.csvExport.formatDateTime(log.timestamp),
      action_type: log.action_type,
      location_type: log.location_type || '',
      is_manual: log.is_manual ? 'Thủ công' : 'Tự động',
      note: log.note || '',
      created_at: this.csvExport.formatDateTime(log.created_at),
    }));

    const fieldMapping = {
      user_id: 'Mã NV',
      user_name: 'Tên nhân viên',
      email: 'Email',
      division: 'Phòng ban',
      work_date: 'Ngày làm việc',
      timestamp: 'Thời gian',
      action_type: 'Loại hành động',
      location_type: 'Địa điểm',
      is_manual: 'Chấm công',
      note: 'Ghi chú',
      created_at: 'Ngày tạo',
    };

    return this.csvExport.exportWithCustomHeaders(csvData, fieldMapping);
  }

  /**
   * Export leave requests to CSV
   */
  async exportLeaveRequests(
    startDate?: string,
    endDate?: string,
    divisionId?: number,
    status?: string,
  ): Promise<string> {
    const where: any = {};

    if (startDate && endDate) {
      where.start_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    if (divisionId) {
      where.user = {
        user_division: {
          some: {
            divisionId: divisionId,
          },
        },
      };
    }

    const leaveRequests = await this.prisma.day_offs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            user_information: {
              select: {
                name: true,
              },
            },
            email: true,
            user_division: {
              include: {
                division: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    const csvData = leaveRequests.map((leave) => ({
      user_id: leave.user_id,
      user_name: leave.user.user_information?.[0]?.name || '',
      email: leave.user.email,
      division: leave.user.user_division?.[0]?.division?.name || '',
      type: leave.type,
      work_date: this.csvExport.formatDate(leave.work_date),
      duration: leave.duration,
      title: leave.title,
      status: leave.status,
      reason: leave.reason || '',
      created_at: this.csvExport.formatDateTime(leave.created_at),
    }));

    const fieldMapping = {
      user_id: 'Mã NV',
      user_name: 'Tên nhân viên',
      email: 'Email',
      division: 'Phòng ban',
      type: 'Loại nghỉ phép',
      work_date: 'Ngày nghỉ',
      duration: 'Thời lượng',
      title: 'Tiêu đề',
      status: 'Trạng thái',
      reason: 'Lý do',
      created_at: 'Ngày tạo',
    };

    return this.csvExport.exportWithCustomHeaders(csvData, fieldMapping);
  }

  /**
   * Export overtime records to CSV
   */
  async exportOvertimeRecords(
    startDate?: string,
    endDate?: string,
    divisionId?: number,
    status?: string,
  ): Promise<string> {
    const where: any = {};

    if (startDate && endDate) {
      where.work_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    if (divisionId) {
      where.user = {
        user_division: {
          some: {
            divisionId: divisionId,
          },
        },
      };
    }

    const overtimeRecords = await this.prisma.over_times_history.findMany({
      where,
      orderBy: { work_date: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            user_information: {
              select: {
                name: true,
              },
            },
            email: true,
            user_division: {
              include: {
                division: {
                  select: { name: true },
                },
              },
            },
          },
        },
        project: {
          select: { name: true, code: true },
        },
      },
    });

    const csvData = overtimeRecords.map((overtime) => ({
      user_id: overtime.user_id,
      user_name: overtime.user.user_information?.[0]?.name || '',
      email: overtime.user.email,
      division: overtime.user.user_division?.[0]?.division?.name || '',
      project: overtime.project
        ? `${overtime.project.code} - ${overtime.project.name}`
        : '',
      work_date: this.csvExport.formatDate(overtime.work_date),
      title: overtime.title,
      start_time: overtime.start_time.toISOString().split('T')[1].substring(0, 5),
      end_time: overtime.end_time.toISOString().split('T')[1].substring(0, 5),
      total_hours: overtime.total_hours || 0,
      total_amount: overtime.total_amount || 0,
      status: overtime.status,
      reason: overtime.reason || '',
      created_at: this.csvExport.formatDateTime(overtime.created_at),
    }));

    const fieldMapping = {
      user_id: 'Mã NV',
      user_name: 'Tên nhân viên',
      email: 'Email',
      division: 'Phòng ban',
      project: 'Dự án',
      work_date: 'Ngày làm việc',
      title: 'Tiêu đề',
      start_time: 'Giờ bắt đầu',
      end_time: 'Giờ kết thúc',
      total_hours: 'Tổng giờ',
      total_amount: 'Tổng tiền',
      status: 'Trạng thái',
      reason: 'Lý do',
      created_at: 'Ngày tạo',
    };

    return this.csvExport.exportWithCustomHeaders(csvData, fieldMapping);
  }

  /**
   * Export late/early requests to CSV
   */
  async exportLateEarlyRequests(
    startDate?: string,
    endDate?: string,
    divisionId?: number,
  ): Promise<string> {
    const where: any = {};

    if (startDate && endDate) {
      where.work_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (divisionId) {
      where.user = {
        user_division: {
          some: {
            divisionId: divisionId,
          },
        },
      };
    }

    const requests = await this.prisma.late_early_requests.findMany({
      where,
      orderBy: { work_date: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            user_information: {
              select: {
                name: true,
              },
            },
            email: true,
            user_division: {
              include: {
                division: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    const csvData = requests.map((request) => ({
      user_id: request.user_id,
      user_name: request.user.user_information?.[0]?.name || '',
      email: request.user.email,
      division: request.user.user_division?.[0]?.division?.name || '',
      work_date: this.csvExport.formatDate(request.work_date),
      request_type: request.request_type,
      reason: request.reason || '',
      status: request.status,
      created_at: this.csvExport.formatDateTime(request.created_at),
    }));

    const fieldMapping = {
      user_id: 'Mã NV',
      user_name: 'Tên nhân viên',
      email: 'Email',
      division: 'Phòng ban',
      work_date: 'Ngày làm việc',
      request_type: 'Loại yêu cầu',
      reason: 'Lý do',
      status: 'Trạng thái',
      created_at: 'Ngày tạo',
    };

    return this.csvExport.exportWithCustomHeaders(csvData, fieldMapping);
  }

  /**
   * Export remote work requests to CSV
   */
  async exportRemoteWorkRequests(
    startDate?: string,
    endDate?: string,
    divisionId?: number,
    status?: string,
  ): Promise<string> {
    const where: any = {};

    if (startDate && endDate) {
      where.work_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    if (divisionId) {
      where.user = {
        user_division: {
          some: {
            divisionId: divisionId,
          },
        },
      };
    }

    const requests = await this.prisma.remote_work_requests.findMany({
      where,
      orderBy: { work_date: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            user_information: {
              select: {
                name: true,
              },
            },
            email: true,
            user_division: {
              include: {
                division: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    const csvData = requests.map((request) => ({
      user_id: request.user_id,
      user_name: request.user.user_information?.[0]?.name || '',
      email: request.user.email,
      division: request.user.user_division?.[0]?.division?.name || '',
      work_date: this.csvExport.formatDate(request.work_date),
      reason: request.reason || '',
      status: request.status,
      created_at: this.csvExport.formatDateTime(request.created_at),
    }));

    const fieldMapping = {
      user_id: 'Mã NV',
      user_name: 'Tên nhân viên',
      email: 'Email',
      division: 'Phòng ban',
      work_date: 'Ngày làm việc',
      reason: 'Lý do',
      status: 'Trạng thái',
      created_at: 'Ngày tạo',
    };

    return this.csvExport.exportWithCustomHeaders(csvData, fieldMapping);
  }
}

