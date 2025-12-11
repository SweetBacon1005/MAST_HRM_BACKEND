import { DateTime } from 'luxon';

export class DateFormatUtil {
  /**
   * Format datetime thành yyyy-mm-dd HH:MM:SS (Asia/Ho_Chi_Minh timezone)
   * Dùng cho các field như created_at, updated_at, checkin, checkout
   */
  static formatDateTime(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    
    try {
      const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
      return dt.setZone('Asia/Ho_Chi_Minh').toFormat('yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      return null;
    }
  }

  /**
   * Format date thành yyyy-mm-dd (Asia/Ho_Chi_Minh timezone)
   * Dùng cho các field như birthday, work_date, start_date, end_date
   */
  static formatDate(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    
    try {
      const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
      return dt.setZone('Asia/Ho_Chi_Minh').toFormat('yyyy-MM-dd');
    } catch (error) {
      return null;
    }
  }

  /**
   * Format thời gian thành HH:MM (Asia/Ho_Chi_Minh timezone)
   * Dùng cho các field như checkin_checkout
   */
  static formatTime(date: Date | string | null | undefined): string | null {
    if (!date) return null;
    
    try {
      const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
      return dt.setZone('Asia/Ho_Chi_Minh').toFormat('HH:mm');
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse date string thành Date object
   */
  static parseDate(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    
    try {
      const dt = DateTime.fromISO(dateString);
      return dt.isValid ? dt.toJSDate() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Kiểm tra xem string có phải là date hợp lệ không
   */
  static isValidDate(dateString: string): boolean {
    try {
      const dt = DateTime.fromISO(dateString);
      return dt.isValid;
    } catch {
      return false;
    }
  }

  /**
   * Lấy ngày hiện tại theo format yyyy-mm-dd (Asia/Ho_Chi_Minh timezone)
   */
  static getCurrentDate(): string {
    return DateTime.now().setZone('Asia/Ho_Chi_Minh').toFormat('yyyy-MM-dd');
  }

  /**
   * Lấy datetime hiện tại theo format yyyy-mm-dd HH:MM:SS (Asia/Ho_Chi_Minh timezone)
   */
  static getCurrentDateTime(): string {
    return DateTime.now().setZone('Asia/Ho_Chi_Minh').toFormat('yyyy-MM-dd HH:mm:ss');
  }

  /**
   * Chuyển đổi timezone
   */
  static toTimezone(date: Date | string, timezone: string = 'Asia/Ho_Chi_Minh'): DateTime {
    const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
    return dt.setZone(timezone);
  }

  /**
   * Format datetime với timezone
   */
  static formatDateTimeWithTimezone(
    date: Date | string | null | undefined,
    timezone: string = 'Asia/Ho_Chi_Minh'
  ): string | null {
    if (!date) return null;
    
    try {
      const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
      return dt.setZone(timezone).toFormat('yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      return null;
    }
  }

  /**
   * Tính khoảng cách giữa 2 thời điểm (tính bằng phút)
   */
  static getDifferenceInMinutes(start: Date | string, end: Date | string): number {
    try {
      const startDt = typeof start === 'string' ? DateTime.fromISO(start) : DateTime.fromJSDate(start);
      const endDt = typeof end === 'string' ? DateTime.fromISO(end) : DateTime.fromJSDate(end);
      
      return Math.round(endDt.diff(startDt, 'minutes').minutes);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Kiểm tra xem có phải ngày hôm nay không
   */
  static isToday(date: Date | string): boolean {
    try {
      const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
      const today = DateTime.now();
      return dt.hasSame(today, 'day');
    } catch {
      return false;
    }
  }

  /**
   * Lấy đầu ngày (00:00:00)
   */
  static getStartOfDay(date: Date | string): Date {
    const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
    return dt.startOf('day').toJSDate();
  }

  /**
   * Lấy cuối ngày (23:59:59)
   */
  static getEndOfDay(date: Date | string): Date {
    const dt = typeof date === 'string' ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
    return dt.endOf('day').toJSDate();
  }
}
