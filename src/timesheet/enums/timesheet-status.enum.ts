import { TimesheetStatus as PrismaTimesheetStatus } from "@prisma/client";
/**
 * Loại timesheet
 */
export enum TimesheetType {
  NORMAL = 'NORMAL', // Ngày làm việc bình thường
  OVERTIME = 'OVERTIME', // Làm thêm giờ
  HOLIDAY = 'HOLIDAY', // Ngày lễ
}

/**
 * Workflow transitions cho timesheet state
 */
export class TimesheetStatusManager {
  /**
   * Kiểm tra xem có thể chuyển từ state này sang state khác không
   */
  static canTransition(from: PrismaTimesheetStatus, to: PrismaTimesheetStatus): boolean {
    const validTransitions: Record<PrismaTimesheetStatus, PrismaTimesheetStatus[]> = {
      [PrismaTimesheetStatus.PENDING]: [
        PrismaTimesheetStatus.APPROVED,
        PrismaTimesheetStatus.REJECTED,
      ],
      [PrismaTimesheetStatus.APPROVED]: [
        PrismaTimesheetStatus.REJECTED,
      ],
      [PrismaTimesheetStatus.REJECTED]: [
        PrismaTimesheetStatus.APPROVED,
      ],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Kiểm tra xem timesheet có thể chỉnh sửa không
   */
  static canEdit(state: PrismaTimesheetStatus): boolean {
    return ([PrismaTimesheetStatus.PENDING, PrismaTimesheetStatus.REJECTED] as PrismaTimesheetStatus[]).includes(state);
  }

  /**
   * Kiểm tra xem timesheet có thể xóa không
   */ 
  static canDelete(state: PrismaTimesheetStatus): boolean {
    return ([PrismaTimesheetStatus.PENDING, PrismaTimesheetStatus.REJECTED] as PrismaTimesheetStatus[]).includes(state);
  }

  /**
   * Lấy tên trạng thái
   */
  static getStateName(state: PrismaTimesheetStatus): string {
    const names = {
      [PrismaTimesheetStatus.PENDING]: 'Chờ duyệt',
      [PrismaTimesheetStatus.APPROVED]: 'Đã duyệt',
      [PrismaTimesheetStatus.REJECTED]: 'Bị từ chối',
    };

    return names[state] || 'Không xác định';
  }
}
