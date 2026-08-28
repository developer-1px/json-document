import { Temporal } from "@js-temporal/polyfill";

export type HtmlDateType = "date" | "time" | "datetime-local" | "month" | "week";
export type CalendarGrain = "week" | "month" | "year";
export type CalendarPeriod = "day" | CalendarGrain;
export type DateRangeValue = { readonly start: string; readonly end: string };
export type VisiblePeriodLabelOptions = {
  readonly monthNames?: ReadonlyArray<string>;
  readonly weekSeparator?: string;
};

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/;
const MONTH = /^(\d{4})-(\d{2})$/;
const WEEK = /^(\d{4})-W(\d{2})$/;

export function parseHtmlDateValue(type: HtmlDateType, value: string): string | null {
  if (type === "date") return parseDate(value);
  if (type === "time") return parseTime(value);
  if (type === "datetime-local") return parseDateTimeLocal(value);
  if (type === "month") return parseMonth(value);
  return parseWeek(value);
}

export function parseDate(value: string): string | null {
  if (!DATE.test(value)) return null;
  try {
    return Temporal.PlainDate.from(value).toString();
  } catch {
    return null;
  }
}

export function parseTime(value: string): string | null {
  const match = TIME.exec(value);
  if (!match) return null;
  try {
    return Temporal.PlainTime.from(value).toString({ smallestUnit: "minute" });
  } catch {
    return null;
  }
}

export function parseDateTimeLocal(value: string): string | null {
  if (!DATETIME.test(value)) return null;
  try {
    return Temporal.PlainDateTime.from(value).toString({ smallestUnit: "minute" });
  } catch {
    return null;
  }
}

export function calendarTimeLabel(value: string): string {
  const parsed = parseDateTimeLocal(value);
  if (parsed === null) return "";
  return Temporal.PlainDateTime.from(parsed).toPlainTime().toString({ smallestUnit: "minute" });
}

export function parseMonth(value: string): string | null {
  const match = MONTH.exec(value);
  if (!match) return null;
  try {
    const date = Temporal.PlainYearMonth.from(value);
    return date.toString();
  } catch {
    return null;
  }
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
  return Temporal.PlainDate.from(date).add({ days }).toString();
}

export function addCalendarMonths(date: string, months: number): string {
  return Temporal.PlainDate.from(date).add({ months }, { overflow: "constrain" }).toString();
}

export function addCalendarYears(date: string, years: number): string {
  return Temporal.PlainDate.from(date).add({ years }, { overflow: "constrain" }).toString();
}

export function startOfIsoWeek(date: string): string {
  const weekday = isoWeekday(date);
  return addCalendarDays(date, 1 - weekday);
}

export function startOfMonth(date: string): string {
  return Temporal.PlainDate.from(date).with({ day: 1 }).toString();
}

export function startOfYear(date: string): string {
  return Temporal.PlainDate.from(date).with({ month: 1, day: 1 }).toString();
}

export function calendarYearMonths(visibleDate: string): ReadonlyArray<string> {
  const yearStart = startOfYear(visibleDate);
  return Array.from({ length: 12 }, (_, index) => addCalendarMonths(yearStart, index));
}

export function isoWeekday(date: string): number {
  return Temporal.PlainDate.from(date).dayOfWeek;
}

export function isoWeekFromDate(date: string): string {
  const parsed = Temporal.PlainDate.from(date);
  if (parsed.yearOfWeek === undefined || parsed.weekOfYear === undefined) {
    throw new RangeError("ISO calendar date must expose a week year and week number.");
  }
  return `${padYear(parsed.yearOfWeek)}-W${pad(parsed.weekOfYear)}`;
}

export function dateFromIsoWeek(value: string): string | null {
  const parsed = parseWeek(value);
  if (parsed === null) return null;
  const year = Number(parsed.slice(0, 4));
  const week = Number(parsed.slice(6));
  const jan4 = Temporal.PlainDate.from({ year, month: 1, day: 4 });
  return jan4.subtract({ days: jan4.dayOfWeek - 1 }).add({ weeks: week - 1 }).toString();
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

export function calendarCells(period: CalendarPeriod, visibleDate: string): ReadonlyArray<CalendarCell> {
  if (period === "day") return [cell(visibleDate, true)];
  if (period === "week") {
    const start = startOfIsoWeek(visibleDate);
    return Array.from({ length: 7 }, (_, index) => cell(addCalendarDays(start, index), true));
  }
  if (period === "month") {
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

export function calendarMonthWeeks(visibleDate: string): ReadonlyArray<ReadonlyArray<CalendarCell>> {
  const cells = calendarCells("month", visibleDate);
  return Array.from({ length: 6 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}

export function visiblePeriodLabel(
  period: CalendarPeriod,
  visibleDate: string,
  options: VisiblePeriodLabelOptions = {},
): string {
  if (period === "day") return visibleDate;
  const parts = civil(visibleDate);
  if (period === "week") {
    const start = startOfIsoWeek(visibleDate);
    if (options.weekSeparator === undefined) return `${start} · week`;
    return `${start}${options.weekSeparator}${addCalendarDays(start, 6)}`;
  }
  if (period === "month") {
    const fallback = `${padYear(parts.year)}-${pad(parts.month)}`;
    const monthName = options.monthNames?.[parts.month - 1];
    return monthName === undefined ? fallback : `${monthName} ${padYear(parts.year)}`;
  }
  return padYear(parts.year);
}

function cell(date: string, inVisiblePeriod: boolean): CalendarCell {
  return { date, inVisiblePeriod, weekday: isoWeekday(date) };
}

function civil(date: string): { year: number; month: number; day: number } {
  const parsed = Temporal.PlainDate.from(date);
  return { year: parsed.year, month: parsed.month, day: parsed.day };
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
