import { useEffect, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import {
  calendarAllDaySpan,
  calendarDatePart,
  calendarDocumentCalendar,
  calendarIntervalLastDate,
  calendarRecurrenceWithFrequency,
  calendarRecurrenceWithInterval,
  calendarRecurrenceWithUntil,
  type CalendarCalendar,
} from "@interactive-os/json-document-editing";
import {
  Choice,
  Command,
  ContextualControls,
  Toggle,
  type ControlAffordance,
} from "@interactive-os/json-document-ui-primitives-react";
import { HtmlDateField } from "./date-controls.js";
import { calendarTimeLabel } from "./date-values.js";
import type { CalendarHand } from "./use-calendar-hand.js";
import { useCalendarRenameInput } from "./use-calendar-rename-input.js";

export interface CalendarEventInspectorAffordances {
  readonly inspector: ControlAffordance;
  readonly edit: ControlAffordance;
  readonly remove: ControlAffordance;
  readonly titleField: ControlAffordance;
  readonly allDayToggle: ControlAffordance;
  readonly startField: ControlAffordance;
  readonly endField: ControlAffordance;
  readonly calendarChoice: ControlAffordance;
  readonly recurrenceChoice: ControlAffordance;
  readonly recurrenceInterval: ControlAffordance;
}

export interface CalendarEventInspectorClassNames {
  readonly root?: string;
  readonly header?: string;
  readonly title?: string;
  readonly titleInput?: string;
  readonly actions?: string;
  readonly summary?: string;
  readonly details?: string;
  readonly field?: string;
  readonly fieldLabel?: string;
  readonly toggle?: string;
  readonly numberInput?: string;
}

export interface CalendarEventInspectorLabels {
  readonly inspector: string;
  readonly title: string;
  readonly edit: string;
  readonly remove: string;
  readonly allDay: string;
  readonly allDaySummary: string;
  readonly start: string;
  readonly end: string;
  readonly calendar: string;
  readonly repeat: string;
  readonly repeats: string;
  readonly none: string;
  readonly daily: string;
  readonly weekly: string;
  readonly monthly: string;
  readonly yearly: string;
  readonly every: string;
  readonly repeatEvery: string;
  readonly repeatUntil: string;
  readonly editOccurrence: string;
  readonly thisOccurrence: string;
  readonly followingOccurrences: string;
  readonly allOccurrences: string;
}

export interface CalendarEventInspectorIcons {
  readonly edit?: ReactNode;
  readonly remove?: ReactNode;
  readonly time?: ReactNode;
  readonly calendar?: ReactNode;
  readonly repeat?: ReactNode;
}

export interface CalendarEventInspectorProps {
  readonly hand: CalendarHand;
  readonly calendars: ReadonlyArray<CalendarCalendar>;
  readonly affordances: CalendarEventInspectorAffordances;
  readonly classNames: CalendarEventInspectorClassNames;
  readonly labels: CalendarEventInspectorLabels;
  readonly icons?: CalendarEventInspectorIcons;
  readonly realizationKey?: string | null;
  readonly rootRef?: Ref<HTMLElement>;
  readonly style?: CSSProperties;
  readonly placement?: string;
  readonly fits?: boolean;
}

/** Owns the canonical selected-event summary, rename, delete, and detail editing surface. */
export function CalendarEventInspector(props: CalendarEventInspectorProps): ReactNode {
  const { hand } = props;
  const selectedEvent = hand.selectedEvent;
  const [detailsEditing, setDetailsEditing] = useState(false);
  const titleInput = useCalendarRenameInput(hand, {
    commitOnBlur: false,
    realizationKey: props.realizationKey ?? null,
  });
  useEffect(() => {
    setDetailsEditing(hand.renaming);
  }, [hand.renaming, selectedEvent?.id, selectedEvent?.start]);

  if (selectedEvent === null) return null;
  const inspected = hand.inspectedInterval;
  const inspectedStart = inspected?.start ?? selectedEvent.start;
  const inspectedEnd = inspected?.end ?? selectedEvent.end;
  const calendar = calendarDocumentCalendar(hand.document, selectedEvent.calendarId);

  return (
    <ContextualControls
      selected
      editing={hand.renaming}
      capabilities={[{ id: "editor", phases: ["selected", "editing"] }] as const}
    >
      {(context) => context.visible.includes("editor") ? (
        <section
          ref={props.rootRef}
          aria-label={props.labels.inspector}
          data-floating-placement={props.placement}
          data-floating-fits={props.fits ? "true" : "false"}
          data-ui-affordance={props.affordances.inspector}
          style={props.style}
          className={props.classNames.root}
        >
          <header className={props.classNames.header}>
            {hand.renaming ? (
              <input
                ref={titleInput.ref}
                aria-label={props.labels.title}
                data-ui-affordance={props.affordances.titleField}
                className={joinClasses(props.classNames.titleInput, props.classNames.title)}
                value={titleInput.value}
                onFocus={titleInput.onFocus}
                onChange={titleInput.onChange}
                onBlur={titleInput.onBlur}
                onKeyDown={titleInput.onKeyDown}
              />
            ) : <h2 className={props.classNames.title}>{selectedEvent.title}</h2>}
            <div className={props.classNames.actions}>
              <Command affordance={props.affordances.edit} label={props.labels.edit} onClick={() => setDetailsEditing((value) => !value)}>
                {props.icons?.edit}
              </Command>
              <Command affordance={props.affordances.remove} kind="danger" label={props.labels.remove} onClick={hand.removeSelected}>
                {props.icons?.remove}
              </Command>
            </div>
          </header>
          <div className={props.classNames.summary}>
            <p>{props.icons?.time}<span>{calendarDatePart(inspectedStart)} · {selectedEvent.allDay ? props.labels.allDaySummary : `${calendarTimeLabel(inspectedStart)}–${calendarTimeLabel(inspectedEnd)}`}</span></p>
            <p>{props.icons?.calendar}<span>{calendar?.title ?? selectedEvent.calendarId}</span></p>
            {selectedEvent.recurrence === null ? null : <p>{props.icons?.repeat}<span>{props.labels.repeats}</span></p>}
          </div>
          {detailsEditing ? (
            <div className={props.classNames.details}>
              <Toggle
                affordance={props.affordances.allDayToggle}
                pressed={selectedEvent.allDay}
                aria-label={props.labels.allDay}
                className={props.classNames.toggle}
                onClick={() => hand.applySelectedPatch({ allDay: !selectedEvent.allDay })}
              >
                {props.labels.allDay}
              </Toggle>
              <HtmlDateField
                affordance={props.affordances.startField}
                key={selectedEvent.allDay ? "start-date" : "start-datetime"}
                type={selectedEvent.allDay ? "date" : "datetime-local"}
                label={props.labels.start}
                value={inspectedStart}
                onValueChange={(value) => hand.applySelectedPatch({ start: value })}
              />
              <HtmlDateField
                affordance={props.affordances.endField}
                key={selectedEvent.allDay ? "end-date" : "end-datetime"}
                type={selectedEvent.allDay ? "date" : "datetime-local"}
                label={props.labels.end}
                value={selectedEvent.allDay ? calendarIntervalLastDate(inspectedStart, inspectedEnd, true) : inspectedEnd}
                onValueChange={(value) => hand.applySelectedPatch({
                  end: selectedEvent.allDay ? (calendarAllDaySpan(value, value)?.end ?? value) : value,
                })}
              />
              <InspectorChoiceField classNames={props.classNames} label={props.labels.calendar}>
                <Choice
                  presentation="popup"
                  affordance={props.affordances.calendarChoice}
                  label={props.labels.calendar}
                  value={selectedEvent.calendarId}
                  options={props.calendars.map((item) => ({ id: item.id, label: item.title }))}
                  onValueChange={(value) => hand.applySelectedPatch({ calendarId: value })}
                />
              </InspectorChoiceField>
              <InspectorChoiceField classNames={props.classNames} label={props.labels.repeat}>
                <Choice
                  presentation="popup"
                  affordance={props.affordances.recurrenceChoice}
                  label={props.labels.repeat}
                  value={selectedEvent.recurrence?.freq ?? "none"}
                  options={[
                    { id: "none", label: props.labels.none },
                    { id: "daily", label: props.labels.daily },
                    { id: "weekly", label: props.labels.weekly },
                    { id: "monthly", label: props.labels.monthly },
                    { id: "yearly", label: props.labels.yearly },
                  ]}
                  onValueChange={(value) => hand.applySelectedPatch({
                    recurrence: value === "none" ? null : calendarRecurrenceWithFrequency(selectedEvent.recurrence, value),
                  })}
                />
              </InspectorChoiceField>
              {selectedEvent.recurrence === null ? null : (
                <>
                  <label className={props.classNames.field}>
                    <span className={props.classNames.fieldLabel}>{props.labels.every}</span>
                    <input
                      data-ui-affordance={props.affordances.recurrenceInterval}
                      type="number"
                      min={1}
                      aria-label={props.labels.repeatEvery}
                      className={props.classNames.numberInput}
                      value={selectedEvent.recurrence.interval}
                      onChange={(event) => hand.applySelectedPatch({
                        recurrence: calendarRecurrenceWithInterval(selectedEvent.recurrence, event.target.value),
                      })}
                    />
                  </label>
                  <HtmlDateField
                    affordance={props.affordances.endField}
                    type="date"
                    label={props.labels.repeatUntil}
                    value={selectedEvent.recurrence.until}
                    onValueChange={(value) => hand.applySelectedPatch({
                      recurrence: calendarRecurrenceWithUntil(selectedEvent.recurrence, value),
                    })}
                  />
                  <Choice
                    presentation="inline"
                    affordance={props.affordances.recurrenceInterval}
                    label={props.labels.editOccurrence}
                    value={hand.scope}
                    options={[
                      { id: "this", label: props.labels.thisOccurrence },
                      { id: "this-and-following", label: props.labels.followingOccurrences },
                      { id: "all", label: props.labels.allOccurrences },
                    ]}
                    onValueChange={hand.setScope}
                  />
                </>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </ContextualControls>
  );
}

function InspectorChoiceField(props: {
  readonly classNames: CalendarEventInspectorClassNames;
  readonly label: string;
  readonly children: ReactNode;
}): ReactNode {
  return <div className={props.classNames.field}><span className={props.classNames.fieldLabel}>{props.label}</span>{props.children}</div>;
}

function joinClasses(...values: ReadonlyArray<string | undefined>): string | undefined {
  const joined = values.filter(Boolean).join(" ");
  return joined === "" ? undefined : joined;
}
