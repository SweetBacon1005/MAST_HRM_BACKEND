import { Transform } from 'class-transformer';
import { DateFormatUtil } from '../utils/date-format.util';

/**
 * Decorator để transform datetime thành format yyyy-mm-dd HH:MM:SS
 */
export function TransformDateTime() {
  return Transform(({ value }) => {
    if (!value) return null;
    return DateFormatUtil.formatDateTime(value);
  });
}

/**
 * Decorator để transform date thành format yyyy-mm-dd
 */
export function TransformDate() {
  return Transform(({ value }) => {
    if (!value) return null;
    return DateFormatUtil.formatDate(value);
  });
}

/**
 * Decorator để transform time thành format HH:MM
 */
export function TransformTime() {
  return Transform(({ value }) => {
    if (!value) return null;
    return DateFormatUtil.formatTime(value);
  });
}
