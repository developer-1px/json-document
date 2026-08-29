import { calendarTimeLabel } from "./date-values.js";

export type CalendarEventLabelValue = {
  readonly title: string;
  readonly start: string;
  readonly allDay: boolean;
};

export function calendarEventLabel(event: CalendarEventLabelValue): string {
  if (event.allDay) return event.title;
  const time = calendarTimeLabel(event.start);
  return time.length > 0 ? `${time} ${event.title}` : event.title;
}
