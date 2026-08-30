import type { ControlAffordance } from "@interactive-os/json-document-ui-primitives-react";

/** Product-policy ledger for every independently classified Calendar control surface. */
export const calendarControlAffordances = {
  periodPrevious: "persistent",
  periodNext: "persistent",
  today: "persistent",
  viewChoice: "stateful",
  sourceDisclosure: "content-control",
  sourceToggle: "stateful",
  miniPrevious: "persistent",
  miniNext: "persistent",
  miniDate: "content-control",
  allDayCell: "content-control",
  timeCell: "content-control",
  monthCell: "content-control",
  yearMonth: "content-control",
  yearDate: "content-control",
  eventAllDay: "direct",
  eventTimed: "direct",
  eventMonth: "direct",
  overflowDate: "content-control",
  overflowEvent: "direct",
  moreDisclosure: "content-control",
  eventResizeEnd: "direct",
  selectedSlot: "stateful",
  inspector: "stateful",
  inspectorEdit: "contextual",
  inspectorDelete: "contextual-danger",
  titleField: "field",
  allDayToggle: "stateful",
  startField: "field",
  endField: "field",
  calendarChoice: "field",
  recurrenceChoice: "field",
  recurrenceInterval: "field",
  composerInput: "disabled-preview",
  composerSend: "disabled-preview",
} as const satisfies Record<string, ControlAffordance>;

export type CalendarControlSurface = keyof typeof calendarControlAffordances;

export function calendarControlAffordance(surface: CalendarControlSurface): ControlAffordance {
  return calendarControlAffordances[surface];
}
