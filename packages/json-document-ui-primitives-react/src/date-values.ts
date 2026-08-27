export type HtmlDateType = "date" | "time" | "datetime-local" | "month" | "week";
export type CalendarGrain = "week" | "month" | "year";
export type DateRangeValue = { readonly start: string; readonly end: string };

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const MONTH = /^(\d{4})-(\d{2})$/;
const WEEK = /^(\d{4})-W(\d{2})$/;
const DAY_MS = 86_400_000;

export function parseHtmlDateValue(type: HtmlDateType, value: string): string | null {
  if (type === "date") return parseDate(value);
  if (type === "time") return parseTime(value);
  if (type === "datetime-local") return parseDateTimeLocal(value);
  if (type === "month") return parseMonth(value);
  return parseWeek(value);
}

export function parseDate(value: string): string | null {
  const match = DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isCivilDate(year, month, day)) return null;
  return formatDate(year, month, day);
}

export function parseTime(value: string): string | null {
  const match = TIME.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

export function parseDateTimeLocal(value: string): string | null {
  const match = DATETIME.exec(value);
  if (!match) return null;
  const date = parseDate(`${match[1]}-${match[2]}-${match[3]}`);
  const time = parseTime(`${match[4]}:${match[5]}`);
  if (date === null || time === null) return null;
  return `${date}T${time}`;
}

export function parseMonth(value: string): string | null {
  const match = MONTH.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${padYear(year)}-${pad(month)}`;
}

export function parseWeek(value: string): string | null {
  const match = WEEK.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > isoWeekCount(year)) return null;
  return `${padYear(year)}-W${pad(week)}`;
}

export function formatDate(year: number, month: number, day: number): string {
  return `${padYear(year)}-${pad(month)}-${pad(day)}`;
}

export function addCalendarDays(date: string, days: number): string {
  const parts = civil(date);
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day) + days * DAY_MS;
  const next = new Date(utc);
  return formatDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

export function addCalendarMonths(date: string, months: number): string {
  const parts = civil(date);
  const monthIndex = parts.year * 12 + parts.month - 1 + months;
  const year = Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12 + 1;
  return formatDate(year, month, Math.min(parts.day, daysInMonth(year, month)));
}

export function addCalendarYears(date: string, years: number): string {
  const parts = civil(date);
  const year = parts.year + years;
  return formatDate(year, parts.month, Math.min(parts.day, daysInMonth(year, parts.month)));
}

export function startOfIsoWeek(date: string): string {
  const weekday = isoWeekday(date);
  return addCalendarDays(date, 1 - weekday);
}

export function startOfMonth(date: string): string {
  const parts = civil(date);
  return formatDate(parts.year, parts.month, 1);
}

export function startOfYear(date: string): string {
  return formatDate(civil(date).year, 1, 1);
}

export function isoWeekday(date: string): number {
  const parts = civil(date);
  const day = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isoWeekFromDate(date: string): string {
  const thursday = addCalendarDays(date, 4 - isoWeekday(date));
  const year = civil(thursday).year;
  const week = Math.floor((utcDay(thursday) - utcDay(formatDate(year, 1, 4))) / 7) + 1;
  return `${padYear(year)}-W${pad(week)}`;
}

export function dateFromIsoWeek(value: string): string | null {
  const parsed = parseWeek(value);
  if (parsed === null) return null;
  const year = Number(parsed.slice(0, 4));
  const week = Number(parsed.slice(6));
  const jan4 = formatDate(year, 1, 4);
  return addCalendarDays(startOfIsoWeek(jan4), (week - 1) * 7);
}

export function compareDates(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function orderedRange(start: string, end: string): DateRangeValue {
  return compareDates(start, end) <= 0 ? { start, end } : { start: end, end: start };
}

export function dateInRange(date: string, range: DateRangeValue): boolean {
  return compareDates(range.start, date) <= 0 && compareDates(date, range.end) <= 0;
}

export function moveCalendarDate(date: string, grain: CalendarGrain, key: string): string {
  if (key === "ArrowLeft") return addCalendarDays(date, -1);
  if (key === "ArrowRight") return addCalendarDays(date, 1);
  if (key === "ArrowUp") return addCalendarDays(date, -7);
  if (key === "ArrowDown") return addCalendarDays(date, 7);
  return date;
}

export type CalendarCell = {
  readonly date: string;
  readonly inVisiblePeriod: boolean;
  readonly weekday: number;
};

export function calendarCells(grain: CalendarGrain, visibleDate: string): ReadonlyArray<CalendarCell> {
  if (grain === "week") {
    const start = startOfIsoWeek(visibleDate);
    return Array.from({ length: 7 }, (_, index) => cell(addCalendarDays(start, index), true));
  }
  if (grain === "month") {
    const monthStart = startOfMonth(visibleDate);
    const gridStart = startOfIsoWeek(monthStart);
    const month = civil(visibleDate).month;
    const year = civil(visibleDate).year;
    return Array.from({ length: 42 }, (_, index) => {
      const date = addCalendarDays(gridStart, index);
      const parts = civil(date);
      return cell(date, parts.year === year && parts.month === month);
    });
  }
  const yearStart = startOfYear(visibleDate);
  const year = civil(visibleDate).year;
  const days = civil(visibleDate).year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365;
  return Array.from({ length: days }, (_, index) => cell(addCalendarDays(yearStart, index), true));
}

export function visiblePeriodLabel(grain: CalendarGrain, visibleDate: string): string {
  const parts = civil(visibleDate);
  if (grain === "week") return `${startOfIsoWeek(visibleDate)} · week`;
  if (grain === "month") return `${padYear(parts.year)}-${pad(parts.month)}`;
  return padYear(parts.year);
}

function cell(date: string, inVisiblePeriod: boolean): CalendarCell {
  return { date, inVisiblePeriod, weekday: isoWeekday(date) };
}

function civil(date: string): { year: number; month: number; day: number } {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) };
}

function utcDay(date: string): number {
  const parts = civil(date);
  return Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS;
}

function isCivilDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

function daysInMonth(year: number, month: number): number {
  return [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}

function isLeap(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isoWeekCount(year: number): number {
  return Number(isoWeekFromDate(formatDate(year, 12, 28)).slice(6));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function padYear(value: number): string {
  return String(value).padStart(4, "0");
}
