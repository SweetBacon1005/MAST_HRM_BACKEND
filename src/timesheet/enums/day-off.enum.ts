/**
 * Loại nghỉ phép
 */
export enum DayOffType {
  PAID_LEAVE = 1, // Nghỉ phép có lương
  UNPAID_LEAVE = 2, // Nghỉ phép không lương
  SICK_LEAVE = 3, // Nghỉ ốm
  MATERNITY_LEAVE = 4, // Nghỉ thai sản
  PERSONAL_LEAVE = 5, // Nghỉ việc riêng
  COMPENSATORY_LEAVE = 6, // Nghỉ bù
}

/**
 * Thời gian nghỉ phép
 */
export enum DayOffDuration {
  FULL_DAY = 1, // Cả ngày
  MORNING = 2, // Buổi sáng
  AFTERNOON = 3, // Buổi chiều
}

/**
 * Trạng thái đơn nghỉ phép
 */
export enum DayOffStatus {
  PENDING = 1, // Chờ duyệt
  APPROVED = 2, // Đã duyệt
  REJECTED = 3, // Từ chối
}

/**
 * Helper class để tính toán nghỉ phép
 */
export class DayOffCalculator {
  /**
   * Tính số giờ nghỉ phép theo duration
   */
  static calculateWorkHours(duration: DayOffDuration): {
    morningHours: number;
    afternoonHours: number;
    totalHours: number;
  } {
    const STANDARD_MORNING_HOURS = 4 * 60; // 4 giờ = 240 phút
    const STANDARD_AFTERNOON_HOURS = 4 * 60; // 4 giờ = 240 phút

    switch (duration) {
      case DayOffDuration.FULL_DAY:
        return {
          morningHours: 0,
          afternoonHours: 0,
          totalHours: 0,
        };

      case DayOffDuration.MORNING:
        return {
          morningHours: 0,
          afternoonHours: STANDARD_AFTERNOON_HOURS,
          totalHours: STANDARD_AFTERNOON_HOURS,
        };

      case DayOffDuration.AFTERNOON:
        return {
          morningHours: STANDARD_MORNING_HOURS,
          afternoonHours: 0,
          totalHours: STANDARD_MORNING_HOURS,
        };

      default:
        return {
          morningHours: 0,
          afternoonHours: 0,
          totalHours: 0,
        };
    }
  }

  /**
   * Kiểm tra xem có cần check-in/out không
   */
  static needsAttendance(duration: DayOffDuration): boolean {
    return duration !== DayOffDuration.FULL_DAY;
  }

  /**
   * Lấy tên duration
   */
  static getDurationName(duration: DayOffDuration): string {
    const names = {
      [DayOffDuration.FULL_DAY]: 'Cả ngày',
      [DayOffDuration.MORNING]: 'Buổi sáng',
      [DayOffDuration.AFTERNOON]: 'Buổi chiều',
    };

    return names[duration] || 'Không xác định';
  }
}
