/**
 * Timezone utilities for timesheet system
 */
export class TimezoneUtil {
  private static readonly DEFAULT_TIMEZONE_OFFSET = 7; // Asia/Bangkok UTC+7

  /**
   * Chuyển đổi thời gian hiện tại thành ngày làm việc theo timezone
   */
  static toLocalWorkDate(
    date?: Date | string,
    timezoneOffset: number = this.DEFAULT_TIMEZONE_OFFSET,
  ): Date {
    const targetDate = date ? new Date(date) : new Date();

    // Chuyển sang timezone local và lấy ngày bắt đầu (00:00:00)
    const utcTime =
      targetDate.getTime() + targetDate.getTimezoneOffset() * 60000;
    const localTime = new Date(utcTime + timezoneOffset * 3600000);

    // Trả về ngày (00:00:00) theo timezone local
    return new Date(
      localTime.getFullYear(),
      localTime.getMonth(),
      localTime.getDate(),
    );
  }

  /**
   * Lấy ngày hôm nay theo timezone
   */
  static getTodayWorkDate(
    timezoneOffset: number = this.DEFAULT_TIMEZONE_OFFSET,
  ): Date {
    return this.toLocalWorkDate(new Date(), timezoneOffset);
  }

  /**
   * Kiểm tra xem thời gian có thuộc ngày làm việc không
   */
  static isSameWorkDate(
    timestamp: Date | string,
    workDate: Date | string,
    timezoneOffset: number = this.DEFAULT_TIMEZONE_OFFSET,
  ): boolean {
    const tsDate = this.toLocalWorkDate(timestamp, timezoneOffset);
    const wDate = this.toLocalWorkDate(workDate, timezoneOffset);

    return tsDate.getTime() === wDate.getTime();
  }

  /**
   * Tạo khoảng thời gian cho một ngày làm việc
   */
  static getWorkDateRange(
    workDate: Date | string,
    timezoneOffset: number = this.DEFAULT_TIMEZONE_OFFSET,
  ): {
    start: Date;
    end: Date;
  } {
    const localDate = this.toLocalWorkDate(workDate, timezoneOffset);

    return {
      start: new Date(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
        0,
        0,
        0,
        0,
      ),
      end: new Date(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
        23,
        59,
        59,
        999,
      ),
    };
  }

  /**
   * Format work date string (YYYY-MM-DD)
   */
  static formatWorkDate(
    date: Date | string,
    timezoneOffset: number = this.DEFAULT_TIMEZONE_OFFSET,
  ): string {
    const localDate = this.toLocalWorkDate(date, timezoneOffset);
    return localDate.toISOString().split('T')[0];
  }

  /**
   * Tạo work_date từ timestamp hiện tại
   */
  static getCurrentWorkDate(): string {
    return this.formatWorkDate(new Date());
  }
}
