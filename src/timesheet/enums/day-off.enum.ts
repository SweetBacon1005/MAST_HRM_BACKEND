import { DayOffDuration as PrismaDayOffDuration } from "@prisma/client";

/**
 * Helper class để tính toán nghỉ phép
 */
export class DayOffCalculator {
  /**
   * Tính số giờ nghỉ phép theo duration
   */
  static calculateWorkHours(duration: PrismaDayOffDuration): {
    morningHours: number;
    afternoonHours: number;
    totalHours: number;
  } {
    const STANDARD_MORNING_HOURS = 4 * 60; // 4 giờ = 240 phút
    const STANDARD_AFTERNOON_HOURS = 4 * 60; // 4 giờ = 240 phút

    switch (duration) {
      case PrismaDayOffDuration.FULL_DAY:
        return {
          morningHours: 0,
          afternoonHours: 0,
          totalHours: 0,
        };

      case PrismaDayOffDuration.MORNING:
        return {
          morningHours: 0,
          afternoonHours: STANDARD_AFTERNOON_HOURS,
          totalHours: STANDARD_AFTERNOON_HOURS,
        };

      case PrismaDayOffDuration.AFTERNOON:
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
  static needsAttendance(duration: PrismaDayOffDuration): boolean {
    return duration !== PrismaDayOffDuration.FULL_DAY;
  }

  static getDurationName(duration: PrismaDayOffDuration): string {
    const names = {
      [PrismaDayOffDuration.FULL_DAY]: 'Cả ngày',
      [PrismaDayOffDuration.MORNING]: 'Buổi sáng',
      [PrismaDayOffDuration.AFTERNOON]: 'Buổi chiều',
    };

    return names[duration] || 'Không xác định';
  }
}
