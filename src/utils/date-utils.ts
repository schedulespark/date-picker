export interface DateParts {
  day: number;
  month: number;
  year: number;
}

export interface CalendarDayCell {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/* eslint-disable jsdoc/require-jsdoc -- data constants documented inline */

/**
 * Full month names for display in calendars.
 */
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Abbreviated weekday names (Sunday through Saturday).
 */
export const WEEKDAY_SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* eslint-enable jsdoc/require-jsdoc */

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Returns whether the given year is a leap year in the Gregorian calendar.
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the number of days in the given zero-based month (0=January) for the given year.
 */
function daysInMonth(year: number, month: number): number {
  if (month === 1 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month] ?? 30;
}

/**
 * Parses a "YYYY-MM-DD" string into its parts, or null if it isn't a real calendar date.
 */
export function parseDate(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (match === null) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return { day, month, year };
}

/**
 * Formats date parts as "YYYY-MM-DD".
 */
export function formatDate(parts: DateParts): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/**
 * Compares two "YYYY-MM-DD" strings chronologically (safe because the format is
 * zero-padded and lexicographic order matches chronological order).
 */
export function compareDates(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Returns whether a date falls within optional inclusive min/max bounds.
 */
export function isDateInRange(value: string, minDate?: string, maxDate?: string): boolean {
  if (minDate !== undefined && compareDates(value, minDate) < 0) return false;
  if (maxDate !== undefined && compareDates(value, maxDate) > 0) return false;
  return true;
}

/**
 * Clamps a date to optional inclusive min/max bounds.
 */
export function clampDate(value: string, minDate?: string, maxDate?: string): string {
  let result = value;
  if (minDate !== undefined && compareDates(result, minDate) < 0) result = minDate;
  if (maxDate !== undefined && compareDates(result, maxDate) > 0) result = maxDate;
  return result;
}

/**
 * Parses, validates, and clamps a typed value to "YYYY-MM-DD", or returns null if unparseable.
 */
export function normalizeDate(value: string, minDate?: string, maxDate?: string): string | null {
  const parts = parseDate(value);
  if (parts === null) return null;
  return clampDate(formatDate(parts), minDate, maxDate);
}

/**
 * Returns the given date's weekday, 0=Sunday..6=Saturday, matching the `Date#getUTCDay()`
 * convention already used by `RecurringShiftTemplate.byDay`.
 */
export function weekdayOf(value: string): number {
  const parts = parseDate(value);
  if (parts === null) return 0;
  return new Date(Date.UTC(parts.year, parts.month, parts.day)).getUTCDay();
}

/**
 * Adds (or subtracts, if negative) whole days to a date.
 */
export function addDays(value: string, delta: number): string {
  const parts = parseDate(value);
  if (parts === null) return value;
  const next = new Date(Date.UTC(parts.year, parts.month, parts.day + delta));
  return formatDate({ day: next.getUTCDate(), month: next.getUTCMonth(), year: next.getUTCFullYear() });
}

/**
 * Adds (or subtracts) whole months, clamping the day if the target month is shorter.
 */
export function addMonths(value: string, delta: number): string {
  const parts = parseDate(value) ?? { day: 1, month: 0, year: 2000 };
  const totalMonths = (parts.year * 12) + parts.month + delta;
  const year = Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const day = Math.min(parts.day, daysInMonth(year, month));
  return formatDate({ day, month, year });
}

/**
 * Adds (or subtracts) whole years.
 */
export function addYears(value: string, delta: number): string {
  return addMonths(value, delta * 12);
}

/**
 * Returns today's local calendar date as "YYYY-MM-DD".
 */
export function todayString(): string {
  const now = new Date();
  return formatDate({ day: now.getDate(), month: now.getMonth(), year: now.getFullYear() });
}

/**
 * Returns the first day of the given date's month.
 */
export function startOfMonth(value: string): string {
  const parts = parseDate(value) ?? parseDate(todayString());
  if (parts === null) return value;
  return formatDate({ day: 1, month: parts.month, year: parts.year });
}

/**
 * Generates a 42-cell (6-week) month grid for the month containing `monthValue`, starting on
 * `weekStartsOn` (0=Sunday..6=Saturday). Cells outside the target month are included (dimmed by
 * the caller) so the grid always has full weeks.
 */
export function generateMonthGrid(monthValue: string, weekStartsOn = 0): CalendarDayCell[] {
  const parts = parseDate(startOfMonth(monthValue)) ?? parseDate(todayString());
  if (parts === null) return [];

  const firstOfMonth = formatDate({ day: 1, month: parts.month, year: parts.year });
  const firstWeekday = weekdayOf(firstOfMonth);
  const leadingDays = (firstWeekday - weekStartsOn + 7) % 7;
  const gridStart = addDays(firstOfMonth, -leadingDays);
  const today = todayString();

  const cells: CalendarDayCell[] = [];
  for (let index = 0; index < 42; index += 1) {
    const cellDate = addDays(gridStart, index);
    const cellParts = parseDate(cellDate);
    if (cellParts === null) continue;
    cells.push({
      date: cellDate,
      day: cellParts.day,
      isCurrentMonth: cellParts.month === parts.month && cellParts.year === parts.year,
      isToday: cellDate === today
    });
  }
  return cells;
}

/**
 * Formats a month value as "Month YYYY", e.g. "July 2026".
 */
export function monthLabel(monthValue: string): string {
  const parts = parseDate(startOfMonth(monthValue)) ?? parseDate(todayString());
  if (parts === null) return monthValue;
  return `${MONTH_NAMES[parts.month]} ${String(parts.year)}`;
}

/**
 * Rotates the short weekday labels to start on `weekStartsOn`.
 */
export function orderedWeekdayLabels(weekStartsOn = 0): string[] {
  return [...WEEKDAY_SHORT_NAMES.slice(weekStartsOn), ...WEEKDAY_SHORT_NAMES.slice(0, weekStartsOn)];
}

/**
 * Returns all 12 months of the given year, for the month drill-down grid.
 */
export function generateYearMonths(year: number): { label: string; monthValue: string }[] {
  return MONTH_NAMES.map((name, month) => ({
    label: name.slice(0, 3),
    monthValue: formatDate({ day: 1, month, year })
  }));
}

/**
 * Returns a 12-year page containing the given year, aligned to a 12-year boundary, for the
 * year drill-down grid.
 */
export function generateDecadeYears(year: number): number[] {
  const start = Math.floor(year / 12) * 12;
  return Array.from({ length: 12 }, (_, index) => start + index);
}
