import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { CsvExportService } from '../../common/services/csv-export.service';
import {
  MonthlyWorkSummaryResponseDto,
  MonthlyWorkSummaryDetailResponseDto,
} from '../dto/monthly-work-summary.dto';

@Injectable()
export class MonthlyWorkSummaryExportService {
  constructor(private readonly csvExport: CsvExportService) {}

  exportListToCSV(data: MonthlyWorkSummaryResponseDto): string {
    if (!data.data || data.data.length === 0) {
      return '';
    }

    const csvData = data.data.map((summary) => ({
      user_code: summary.user_code || '',
      user_name: summary.user_name,
      user_email: summary.user_email,
      division_name: summary.division_name || '',
      team_name: summary.team_name || '',
      position_name: summary.position_name || '',
      expected_work_days: summary.expected_work_days,
      total_work_days: summary.total_work_days,
      total_work_hours: summary.total_work_hours,
      total_working_sessions: summary.total_working_sessions,
      final_working_sessions: summary.final_working_sessions,
      attendance_rate: summary.attendance_rate.toFixed(2) + '%',
      on_time_rate: summary.on_time_rate.toFixed(2) + '%',
      total_leave_days: summary.total_leave_days,
      paid_leave_days: summary.paid_leave_days,
      unpaid_leave_days: summary.unpaid_leave_days,
      sick_leave_days: summary.sick_leave_days,
      late_count: summary.late_count,
      early_leave_count: summary.early_leave_count,
      total_late_minutes: summary.total_late_minutes,
      total_early_minutes: summary.total_early_minutes,
      remote_work_days: summary.remote_work_days,
      overtime_hours: summary.overtime_hours,
      overtime_days: summary.overtime_days,
      absent_days: summary.absent_days,
    }));

    const fieldMapping = {
      user_code: 'Mã NV',
      user_name: 'Tên nhân viên',
      user_email: 'Email',
      division_name: 'Phòng ban',
      team_name: 'Team',
      position_name: 'Chức vụ',
      expected_work_days: 'Số ngày làm việc yêu cầu',
      total_work_days: 'Số ngày đi làm thực tế',
      total_work_hours: 'Tổng giờ làm việc',
      total_working_sessions: 'Tổng công',
      final_working_sessions: 'Công cuối cùng',
      attendance_rate: 'Tỷ lệ đi làm',
      on_time_rate: 'Tỷ lệ đúng giờ',
      total_leave_days: 'Tổng ngày nghỉ',
      paid_leave_days: 'Nghỉ có lương',
      unpaid_leave_days: 'Nghỉ không lương',
      sick_leave_days: 'Nghỉ ốm',
      late_count: 'Số lần đi muộn',
      early_leave_count: 'Số lần về sớm',
      total_late_minutes: 'Tổng phút muộn',
      total_early_minutes: 'Tổng phút sớm',
      remote_work_days: 'Số ngày remote',
      overtime_hours: 'Số giờ tăng ca',
      overtime_days: 'Số ngày tăng ca',
      absent_days: 'Số ngày vắng mặt',
    };

    return this.csvExport.exportWithCustomHeaders(csvData, fieldMapping);
  }

  exportDetailToCSV(data: MonthlyWorkSummaryDetailResponseDto): {
    summary: string;
    daily: string;
    violations: string;
    leaves: string;
    overtimes: string;
  } {
    const summaryData = [
      {
        user_code: data.summary.user_code || '',
        user_name: data.summary.user_name,
        user_email: data.summary.user_email,
        division_name: data.summary.division_name || '',
        team_name: data.summary.team_name || '',
        position_name: data.summary.position_name || '',
        expected_work_days: data.summary.expected_work_days,
        total_work_days: data.summary.total_work_days,
        total_work_hours: data.summary.total_work_hours,
        total_working_sessions: data.summary.total_working_sessions,
        final_working_sessions: data.summary.final_working_sessions,
        attendance_rate: data.summary.attendance_rate.toFixed(2) + '%',
        on_time_rate: data.summary.on_time_rate.toFixed(2) + '%',
        total_leave_days: data.summary.total_leave_days,
        late_count: data.summary.late_count,
        early_leave_count: data.summary.early_leave_count,
        remote_work_days: data.summary.remote_work_days,
        overtime_hours: data.summary.overtime_hours,
        absent_days: data.summary.absent_days,
      },
    ];

    const summaryFieldMapping = {
      user_code: 'Mã NV',
      user_name: 'Tên nhân viên',
      user_email: 'Email',
      division_name: 'Phòng ban',
      team_name: 'Team',
      position_name: 'Chức vụ',
      expected_work_days: 'Số ngày yêu cầu',
      total_work_days: 'Số ngày đi làm',
      total_work_hours: 'Tổng giờ làm',
      total_working_sessions: 'Tổng công',
      final_working_sessions: 'Công cuối cùng',
      attendance_rate: 'Tỷ lệ đi làm',
      on_time_rate: 'Tỷ lệ đúng giờ',
      total_leave_days: 'Tổng ngày nghỉ',
      late_count: 'Số lần đi muộn',
      early_leave_count: 'Số lần về sớm',
      remote_work_days: 'Ngày remote',
      overtime_hours: 'Giờ tăng ca',
      absent_days: 'Ngày vắng',
    };

    const summaryCsv =
      this.csvExport.exportWithCustomHeaders(summaryData, summaryFieldMapping);

    const dailyFieldMapping = {
      date: 'Ngày',
      day_of_week: 'Thứ',
      checkin_time: 'Giờ vào',
      checkout_time: 'Giờ ra',
      work_hours: 'Giờ làm',
      late_minutes: 'Phút muộn',
      early_minutes: 'Phút sớm',
      status: 'Trạng thái',
      remote_type: 'Loại',
      morning_session: 'Công sáng',
      afternoon_session: 'Công chiều',
      total_sessions: 'Tổng công',
      notes: 'Ghi chú',
    };

    const dailyCsv =
      data.daily_details.length > 0
        ? this.csvExport.exportWithCustomHeaders(
            data.daily_details as unknown as Record<string, unknown>[],
            dailyFieldMapping,
          )
        : '';

    const violationsFieldMapping = {
      date: 'Ngày',
      type: 'Loại vi phạm',
      late_minutes: 'Phút muộn',
      early_minutes: 'Phút sớm',
      has_approved_request: 'Có đơn duyệt',
      reason: 'Lý do',
    };

    const violationsCsv =
      data.violations.length > 0
        ? this.csvExport.exportWithCustomHeaders(
            data.violations as unknown as Record<string, unknown>[],
            violationsFieldMapping,
          )
        : '';

    const leavesData = data.leave_details.map((leave) => ({
      date: leave.date,
      duration: leave.duration,
      type: leave.type,
      status: leave.status,
      reason: leave.reason || '',
      approved_by_name: leave.approved_by_name || '',
      approved_at: leave.approved_at
        ? this.csvExport.formatDateTime(leave.approved_at)
        : '',
    }));

    const leavesFieldMapping = {
      date: 'Ngày nghỉ',
      duration: 'Thời lượng',
      type: 'Loại nghỉ',
      status: 'Trạng thái',
      reason: 'Lý do',
      approved_by_name: 'Người duyệt',
      approved_at: 'Thời gian duyệt',
    };

    const leavesCsv =
      leavesData.length > 0
        ? this.csvExport.exportWithCustomHeaders(leavesData, leavesFieldMapping)
        : '';

    const overtimesData = data.overtime_details.map((overtime) => ({
      date: overtime.date,
      title: overtime.title,
      total_hours: overtime.total_hours,
      status: overtime.status,
      approved_by_name: overtime.approved_by_name || '',
      approved_at: overtime.approved_at
        ? this.csvExport.formatDateTime(overtime.approved_at)
        : '',
    }));

    const overtimesFieldMapping = {
      date: 'Ngày tăng ca',
      title: 'Tiêu đề',
      total_hours: 'Số giờ',
      status: 'Trạng thái',
      approved_by_name: 'Người duyệt',
      approved_at: 'Thời gian duyệt',
    };

    const overtimesCsv =
      overtimesData.length > 0
        ? this.csvExport.exportWithCustomHeaders(
            overtimesData,
            overtimesFieldMapping,
          )
        : '';

    return {
      summary: summaryCsv,
      daily: dailyCsv,
      violations: violationsCsv,
      leaves: leavesCsv,
      overtimes: overtimesCsv,
    };
  }

  async exportListToExcel(
    data: MonthlyWorkSummaryResponseDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo công tháng', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    worksheet.columns = [
      { header: 'Mã NV', key: 'user_code', width: 12 },
      { header: 'Tên nhân viên', key: 'user_name', width: 25 },
      { header: 'Email', key: 'user_email', width: 30 },
      { header: 'Phòng ban', key: 'division_name', width: 20 },
      { header: 'Team', key: 'team_name', width: 20 },
      { header: 'Chức vụ', key: 'position_name', width: 20 },
      { header: 'Số ngày yêu cầu', key: 'expected_work_days', width: 15 },
      { header: 'Số ngày đi làm', key: 'total_work_days', width: 15 },
      { header: 'Tổng giờ làm việc', key: 'total_work_hours', width: 15 },
      { header: 'Tổng công', key: 'total_working_sessions', width: 12 },
      { header: 'Công cuối cùng', key: 'final_working_sessions', width: 15 },
      { header: 'Tỷ lệ đi làm', key: 'attendance_rate', width: 12 },
      { header: 'Tỷ lệ đúng giờ', key: 'on_time_rate', width: 12 },
      { header: 'Tổng ngày nghỉ', key: 'total_leave_days', width: 15 },
      { header: 'Nghỉ có lương', key: 'paid_leave_days', width: 15 },
      { header: 'Nghỉ không lương', key: 'unpaid_leave_days', width: 15 },
      { header: 'Nghỉ ốm', key: 'sick_leave_days', width: 12 },
      { header: 'Số lần đi muộn', key: 'late_count', width: 15 },
      { header: 'Số lần về sớm', key: 'early_leave_count', width: 15 },
      { header: 'Tổng phút muộn', key: 'total_late_minutes', width: 15 },
      { header: 'Tổng phút sớm', key: 'total_early_minutes', width: 15 },
      { header: 'Số ngày remote', key: 'remote_work_days', width: 15 },
      { header: 'Số giờ tăng ca', key: 'overtime_hours', width: 15 },
      { header: 'Số ngày tăng ca', key: 'overtime_days', width: 15 },
      { header: 'Số ngày vắng mặt', key: 'absent_days', width: 15 },
    ];

    data.data.forEach((item) => {
      worksheet.addRow({
        user_code: item.user_code || '',
        user_name: item.user_name,
        user_email: item.user_email,
        division_name: item.division_name || '',
        team_name: item.team_name || '',
        position_name: item.position_name || '',
        expected_work_days: item.expected_work_days,
        total_work_days: item.total_work_days,
        total_work_hours: item.total_work_hours,
        total_working_sessions: item.total_working_sessions,
        final_working_sessions: item.final_working_sessions,
        attendance_rate: `${item.attendance_rate.toFixed(2)}%`,
        on_time_rate: `${item.on_time_rate.toFixed(2)}%`,
        total_leave_days: item.total_leave_days,
        paid_leave_days: item.paid_leave_days,
        unpaid_leave_days: item.unpaid_leave_days,
        sick_leave_days: item.sick_leave_days,
        late_count: item.late_count,
        early_leave_count: item.early_leave_count,
        total_late_minutes: item.total_late_minutes,
        total_early_minutes: item.total_early_minutes,
        remote_work_days: item.remote_work_days,
        overtime_hours: item.overtime_hours,
        overtime_days: item.overtime_days,
        absent_days: item.absent_days,
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportDetailToExcel(
    data: MonthlyWorkSummaryDetailResponseDto,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet('Tổng hợp');
    summarySheet.columns = [
      { header: 'Mã NV', key: 'user_code', width: 12 },
      { header: 'Tên nhân viên', key: 'user_name', width: 25 },
      { header: 'Email', key: 'user_email', width: 30 },
      { header: 'Phòng ban', key: 'division_name', width: 20 },
      { header: 'Team', key: 'team_name', width: 20 },
      { header: 'Chức vụ', key: 'position_name', width: 20 },
      { header: 'Số ngày yêu cầu', key: 'expected_work_days', width: 15 },
      { header: 'Số ngày đi làm', key: 'total_work_days', width: 15 },
      { header: 'Tổng giờ làm', key: 'total_work_hours', width: 15 },
      { header: 'Tổng công', key: 'total_working_sessions', width: 12 },
      { header: 'Công cuối cùng', key: 'final_working_sessions', width: 15 },
      { header: 'Tỷ lệ đi làm', key: 'attendance_rate', width: 12 },
      { header: 'Tỷ lệ đúng giờ', key: 'on_time_rate', width: 12 },
    ];
    
    summarySheet.addRow({
      user_code: data.summary.user_code || '',
      user_name: data.summary.user_name,
      user_email: data.summary.user_email,
      division_name: data.summary.division_name || '',
      team_name: data.summary.team_name || '',
      position_name: data.summary.position_name || '',
      expected_work_days: data.summary.expected_work_days,
      total_work_days: data.summary.total_work_days,
      total_work_hours: data.summary.total_work_hours,
      total_working_sessions: data.summary.total_working_sessions,
      final_working_sessions: data.summary.final_working_sessions,
      attendance_rate: `${data.summary.attendance_rate.toFixed(2)}%`,
      on_time_rate: `${data.summary.on_time_rate.toFixed(2)}%`,
    });

    this.styleSheet(summarySheet);

    if (data.daily_details.length > 0) {
      const dailySheet = workbook.addWorksheet('Chi tiết theo ngày');
      dailySheet.columns = [
        { header: 'Ngày', key: 'date', width: 12 },
        { header: 'Thứ', key: 'day_of_week', width: 10 },
        { header: 'Giờ vào', key: 'checkin_time', width: 12 },
        { header: 'Giờ ra', key: 'checkout_time', width: 12 },
        { header: 'Giờ làm', key: 'work_hours', width: 10 },
        { header: 'Phút muộn', key: 'late_minutes', width: 12 },
        { header: 'Phút sớm', key: 'early_minutes', width: 12 },
        { header: 'Trạng thái', key: 'status', width: 15 },
        { header: 'Công sáng', key: 'morning_session', width: 12 },
        { header: 'Công chiều', key: 'afternoon_session', width: 12 },
        { header: 'Tổng công', key: 'total_sessions', width: 12 },
      ];

      data.daily_details.forEach((day) => {
        dailySheet.addRow(day);
      });

      this.styleSheet(dailySheet);
    }

    if (data.violations.length > 0) {
      const violationSheet = workbook.addWorksheet('Vi phạm');
      violationSheet.columns = [
        { header: 'Ngày', key: 'date', width: 12 },
        { header: 'Loại vi phạm', key: 'type', width: 20 },
        { header: 'Phút muộn', key: 'late_minutes', width: 12 },
        { header: 'Phút sớm', key: 'early_minutes', width: 12 },
        { header: 'Có đơn duyệt', key: 'has_approved_request', width: 15 },
        { header: 'Lý do', key: 'reason', width: 30 },
      ];

      data.violations.forEach((violation) => {
        violationSheet.addRow(violation);
      });

      this.styleSheet(violationSheet);
    }

    if (data.leave_details.length > 0) {
      const leaveSheet = workbook.addWorksheet('Nghỉ phép');
      leaveSheet.columns = [
        { header: 'Ngày nghỉ', key: 'date', width: 12 },
        { header: 'Thời lượng', key: 'duration', width: 15 },
        { header: 'Loại nghỉ', key: 'type', width: 20 },
        { header: 'Trạng thái', key: 'status', width: 15 },
        { header: 'Lý do', key: 'reason', width: 30 },
        { header: 'Người duyệt', key: 'approved_by_name', width: 20 },
        { header: 'Thời gian duyệt', key: 'approved_at', width: 20 },
      ];

      data.leave_details.forEach((leave) => {
        leaveSheet.addRow({
          ...leave,
          approved_at: leave.approved_at
            ? this.csvExport.formatDateTime(leave.approved_at)
            : '',
        });
      });

      this.styleSheet(leaveSheet);
    }

    if (data.overtime_details.length > 0) {
      const overtimeSheet = workbook.addWorksheet('Tăng ca');
      overtimeSheet.columns = [
        { header: 'Ngày tăng ca', key: 'date', width: 12 },
        { header: 'Tiêu đề', key: 'title', width: 30 },
        { header: 'Số giờ', key: 'total_hours', width: 10 },
        { header: 'Trạng thái', key: 'status', width: 15 },
        { header: 'Người duyệt', key: 'approved_by_name', width: 20 },
        { header: 'Thời gian duyệt', key: 'approved_at', width: 20 },
      ];

      data.overtime_details.forEach((overtime) => {
        overtimeSheet.addRow({
          ...overtime,
          approved_at: overtime.approved_at
            ? this.csvExport.formatDateTime(overtime.approved_at)
            : '',
        });
      });

      this.styleSheet(overtimeSheet);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private styleSheet(worksheet: ExcelJS.Worksheet) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  }
}
