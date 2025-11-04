import Holidays from 'date-holidays';

const hd = new Holidays('CN'); // 初始化中国节假日实例

/**
 * 检查日期是否为法定节假日（包括周末）
 * @param date 日期字符串 (YYYY-MM-DD) 或 Date 对象
 * @returns 如果是法定节假日或周末，返回 true；否则返回 false
 */
export function isHoliday(date: string | Date): boolean {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // 如果是字符串，转换为 Date 对象
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  // 检查是否为周末（周六或周日）
  const dayOfWeek = dateObj.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true; // 周末
  }
  
  // 检查是否为法定节假日
  const holiday = hd.isHoliday(dateObj);
  return !!holiday;
}

/**
 * 过滤掉法定节假日和周末
 * @param dates 日期字符串数组 (YYYY-MM-DD)
 * @returns 过滤后的工作日日期数组
 */
export function filterHolidays(dates: string[]): string[] {
  return dates.filter(date => !isHoliday(date));
}

