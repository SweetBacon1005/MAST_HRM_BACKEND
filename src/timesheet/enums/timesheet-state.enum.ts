/**
 * Trạng thái của timesheet theo workflow
 */
export enum TimesheetState {
  DRAFT = 0,      // Bản nháp - có thể chỉnh sửa tự do
  PENDING = 1,    // Chờ duyệt - đã submit, chờ manager/HR duyệt
  APPROVED = 2,   // Đã duyệt - không thể sửa, chờ tính lương
  REJECTED = 3,   // Bị từ chối - có thể sửa và submit lại
  LOCKED = 4,     // Đã khóa - đã tính lương, không thể sửa
}

/**
 * Loại timesheet
 */
export enum TimesheetType {
  NORMAL = 1,     // Ngày làm việc bình thường
  OVERTIME = 2,   // Làm thêm giờ
  HOLIDAY = 3,    // Ngày lễ
  WEEKEND = 4,    // Cuối tuần
}

/**
 * Workflow transitions cho timesheet state
 */
export class TimesheetStateManager {
  /**
   * Kiểm tra xem có thể chuyển từ state này sang state khác không
   */
  static canTransition(from: TimesheetState, to: TimesheetState): boolean {
    const validTransitions: Record<TimesheetState, TimesheetState[]> = {
      [TimesheetState.DRAFT]: [TimesheetState.PENDING],
      [TimesheetState.PENDING]: [TimesheetState.APPROVED, TimesheetState.REJECTED],
      [TimesheetState.APPROVED]: [TimesheetState.LOCKED, TimesheetState.REJECTED],
      [TimesheetState.REJECTED]: [TimesheetState.PENDING],
      [TimesheetState.LOCKED]: [], // Không thể chuyển từ LOCKED
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Kiểm tra xem timesheet có thể chỉnh sửa không
   */
  static canEdit(state: TimesheetState): boolean {
    return [TimesheetState.DRAFT, TimesheetState.REJECTED].includes(state);
  }

  /**
   * Kiểm tra xem timesheet có thể xóa không
   */
  static canDelete(state: TimesheetState): boolean {
    return [TimesheetState.DRAFT, TimesheetState.REJECTED].includes(state);
  }

  /**
   * Lấy tên trạng thái
   */
  static getStateName(state: TimesheetState): string {
    const names = {
      [TimesheetState.DRAFT]: 'Bản nháp',
      [TimesheetState.PENDING]: 'Chờ duyệt',
      [TimesheetState.APPROVED]: 'Đã duyệt',
      [TimesheetState.REJECTED]: 'Bị từ chối',
      [TimesheetState.LOCKED]: 'Đã khóa',
    };

    return names[state] || 'Không xác định';
  }
}
