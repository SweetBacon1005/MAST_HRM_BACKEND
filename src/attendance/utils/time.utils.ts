/**
 * Utilities cho tính toán thời gian chấm công
 */

/**
 * Chuyển đổi phút thành giờ:phút
 */
export function minutesToHoursMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}`;
}

/**
 * Chuyển đổi giờ:phút thành phút
 */
export function hoursMinutesToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Tính khoảng cách thời gian giữa 2 thời điểm (phút)
 */
export function calculateTimeDifference(startTime: Date, endTime: Date): number {
  return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
}

/**
 * Kiểm tra xem thời gian có trong khoảng cho phép không
 */
export function isTimeInRange(
  checkTime: Date,
  startTime: Date,
  endTime: Date,
): boolean {
  return checkTime >= startTime && checkTime <= endTime;
}

/**
 * Làm tròn thời gian theo block (ví dụ: 15 phút)
 */
export function roundTimeToBlock(minutes: number, blockSize: number): number {
  return Math.ceil(minutes / blockSize) * blockSize;
}

/**
 * Tính số block vi phạm dựa trên số phút
 */
export function calculateViolationBlocks(
  violationMinutes: number,
  blockSize: number,
): number {
  if (violationMinutes <= 0) return 0;
  return Math.ceil(violationMinutes / blockSize);
}

/**
 * Chuyển đổi timestamp thành ngày (YYYY-MM-DD)
 */
export function timestampToDate(timestamp: Date): string {
  return timestamp.toISOString().split('T')[0];
}

/**
 * Tạo Date object từ ngày và giờ string
 */
export function createDateTime(dateString: string, timeString: string): Date {
  return new Date(`${dateString}T${timeString}:00.000Z`);
}

/**
 * Kiểm tra xem có phải ngày cuối tuần không
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Chủ nhật = 0, Thứ 7 = 6
}

/**
 * Lấy ngày đầu tuần (Thứ 2)
 */
export function getWeekStart(date: Date): Date {
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

/**
 * Lấy ngày cuối tuần (Chủ nhật)
 */
export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(new Date(date));
  return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
}

/**
 * Lấy ngày đầu tháng
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Lấy ngày cuối tháng
 */
export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Tính số ngày làm việc trong tháng (trừ cuối tuần)
 */
export function getWorkingDaysInMonth(year: number, month: number): number {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  let workingDays = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (!isWeekend(d)) {
      workingDays++;
    }
  }

  return workingDays;
}

/**
 * Tính tỷ lệ phần trăm
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100; // Làm tròn 2 chữ số thập phân
}

/**
 * Format số tiền
 */
export function formatCurrency(amount: number, currency = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Validate định dạng thời gian HH:MM
 */
export function isValidTimeFormat(timeString: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

/**
 * Validate định dạng ngày YYYY-MM-DD
 */
export function isValidDateFormat(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date.toISOString().split('T')[0] === dateString;
}

/**
 * Tính tuổi công việc (số tháng)
 */
export function calculateWorkingMonths(startDate: Date, endDate?: Date): number {
  const end = endDate || new Date();
  const monthsDiff = (end.getFullYear() - startDate.getFullYear()) * 12 + 
                     (end.getMonth() - startDate.getMonth());
  return Math.max(0, monthsDiff);
}
