import { Injectable } from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CsvExportService } from '../../common/services/csv-export.service';

@Injectable()
export class AttendanceExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly csvExport: CsvExportService,
  ) {}

  /**
   * Helper: Lấy user IDs theo division
   */
  private async getuser_idsByDivision(division_id: number): Promise<number[]> {
    const assignments = await this.prisma.user_role_assignment.findMany({
      where: {
        scope_type: ScopeType.DIVISION,
        scope_id: division_id,
        deleted_at: null,
      },
      select: { user_id: true },
      distinct: ['user_id'],
    });
    return assignments.map((a) => a.user_id);
  }

  /**
   * Helper: Lấy division name cho user
   */
  private async getDivisionNameForUser(user_id: number): Promise<string> {
    const assignment = await this.prisma.user_role_assignment.findFirst({
      where: {
        user_id: user_id,
        scope_type: ScopeType.DIVISION,
        deleted_at: null,
        scope_id: { not: null },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!assignment?.scope_id) {
      return '';
    }

    const division = await this.prisma.divisions.findUnique({
      where: { id: assignment.scope_id },
      select: { name: true },
    });

    return division?.name || '';
  }

  /**
   * Export attendance logs to CSV
   */
  async exportAttendanceLogs(
    startDate?: string,
    endDate?: string,
    division_id?: number,
  ): Promise<string> {
    const where: any = {};

    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (division_id) {
      const user_ids = await this.getuser_idsByDivision(division_id);
      where.user_id = { in: user_ids };
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
          },
        },
      },
    });

    // Lấy division names cho tất cả users
    const user_ids = [...new Set(logs.map((log) => log.user_id))];
    const divisionNamesMap = new Map<number, string>();
    await Promise.all(
      user_ids.map(async (user_id) => {
        const divisionName = await this.getDivisionNameForUser(user_id);
        divisionNamesMap.set(user_id, divisionName);
      }),
    );

    // Transform data for CSV
    const csvData = logs.map((log) => ({
      user_id: log.user_id,
      email: log.user.email,
      name: log.user.user_information?.name || '',
      division: divisionNamesMap.get(log.user_id) || '',
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
    division_id?: number,
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

    if (division_id) {
      const user_ids = await this.getuser_idsByDivision(division_id);
      where.user_id = { in: user_ids };
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
          },
        },
      },
    });

    // Lấy division names
    const user_ids = [...new Set(leaveRequests.map((leave) => leave.user_id))];
    const divisionNamesMap = new Map<number, string>();
    await Promise.all(
      user_ids.map(async (user_id) => {
        const divisionName = await this.getDivisionNameForUser(user_id);
        divisionNamesMap.set(user_id, divisionName);
      }),
    );

    const csvData = leaveRequests.map((leave) => ({
      user_id: leave.user_id,
      user_name: leave.user.user_information?.name || '',
      email: leave.user.email,
      division: divisionNamesMap.get(leave.user_id) || '',
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
    division_id?: number,
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

    if (division_id) {
      const user_ids = await this.getuser_idsByDivision(division_id);
      where.user_id = { in: user_ids };
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
          },
        },
        project: {
          select: { name: true, code: true },
        },
      },
    });

    // Lấy division names
    const user_ids = [...new Set(overtimeRecords.map((overtime) => overtime.user_id))];
    const divisionNamesMap = new Map<number, string>();
    await Promise.all(
      user_ids.map(async (user_id) => {
        const divisionName = await this.getDivisionNameForUser(user_id);
        divisionNamesMap.set(user_id, divisionName);
      }),
    );

    const csvData = overtimeRecords.map((overtime) => ({
      user_id: overtime.user_id,
      user_name: overtime.user.user_information?.name || '',
      email: overtime.user.email,
      division: divisionNamesMap.get(overtime.user_id) || '',
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
    division_id?: number,
  ): Promise<string> {
    const where: any = {};

    if (startDate && endDate) {
      where.work_date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (division_id) {
      const user_ids = await this.getuser_idsByDivision(division_id);
      where.user_id = { in: user_ids };
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
          },
        },
      },
    });

    // Lấy division names
    const user_ids = [...new Set(requests.map((request) => request.user_id))];
    const divisionNamesMap = new Map<number, string>();
    await Promise.all(
      user_ids.map(async (user_id) => {
        const divisionName = await this.getDivisionNameForUser(user_id);
        divisionNamesMap.set(user_id, divisionName);
      }),
    );

    const csvData = requests.map((request) => ({
      user_id: request.user_id,
      user_name: request.user.user_information?.name || '',
      email: request.user.email,
      division: divisionNamesMap.get(request.user_id) || '',
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
    division_id?: number,
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

    if (division_id) {
      const user_ids = await this.getuser_idsByDivision(division_id);
      where.user_id = { in: user_ids };
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
          },
        },
      },
    });

    // Lấy division names
    const user_ids = [...new Set(requests.map((request) => request.user_id))];
    const divisionNamesMap = new Map<number, string>();
    await Promise.all(
      user_ids.map(async (user_id) => {
        const divisionName = await this.getDivisionNameForUser(user_id);
        divisionNamesMap.set(user_id, divisionName);
      }),
    );

    const csvData = requests.map((request) => ({
      user_id: request.user_id,
      user_name: request.user.user_information?.name || '',
      email: request.user.email,
      division: divisionNamesMap.get(request.user_id) || '',
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
