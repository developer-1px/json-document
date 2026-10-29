import { useId, type ReactNode } from "react";
import { EditableText, Check, Choice, Command, DisclosureButton, Field, FormField, Search, SelectableItem, Tabs, Toggle, ValueInput, NumberField } from "@interactive-os/json-document-ui-primitives-react";
import { CalendarGrid, DateGrid, DatePicker, DateRangePicker, HtmlDateField, RangeCalendar, calendarCells, type CalendarGrain, type HtmlDateType } from "@interactive-os/json-document-calendar";
import type { UIComponentContent } from "@interactive-os/json-document-object-document";
import type { UIComponentInteraction } from "./ui-component-view.js";

export interface UIComponentAdapterProps {
  readonly text: string;
  readonly content: UIComponentContent;
  readonly interaction: UIComponentInteraction | undefined;
}
const controlIds = new Set<string>(["number-field", "editable-text", "button", "page-link", "input", "textarea", "checkbox", "select", "tabs", "search", "value-input", "toggle", "disclosure", "selectable-item", "date-field", "time-field", "datetime-field", "month-field", "week-field", "date-picker", "date-range-picker", "calendar-grid", "range-calendar", "date-grid"]);

/** Adapts serializable content to the owning primitives; hooks live in the component. */
export function renderUIComponentControl(props: UIComponentAdapterProps): ReactNode | undefined {
  return controlIds.has(props.content.component) ? <UIComponentControl {...props} /> : undefined;
}

function UIComponentControl({text, content, interaction}: UIComponentAdapterProps): ReactNode {
  const id = useId();
  const p = content.props ?? {};
  const disabled = !!interaction?.busy || p.disabled === true;
  const change = (value: string | number | boolean) => interaction?.onValueChange(value);
  const options = content.items.map((label, index) => ({id: String(index), label, disabled}));
  const selected = options.find(option => option.label === content.value)?.id ?? (content.value === undefined ? options[0]?.id ?? "" : "");
  const stringValue = String(content.value ?? "");
  switch (content.component) {
    case "button": return <Command kind={content.tone === "accent" ? "primary" : "secondary"} disabled={disabled || !!interaction?.actionUnavailableReason} title={interaction?.actionUnavailableReason} aria-description={interaction?.actionUnavailableReason} onClick={() => interaction?.onAction(content.actionId)}>{text}</Command>;
    case "page-link": return <Command disabled={disabled || !content.targetPageId} onClick={() => content.targetPageId && interaction?.onNavigate(content.targetPageId)}>{text}</Command>;
    case "input": return <FormField label={text} description={typeof p.description === "string" ? p.description : undefined} required={p.required === true}>{control=><Field {...control} label={text} value={stringValue} placeholder={content.detail} disabled={disabled} onValueChange={change}/>}</FormField>;
    case "editable-text": return <EditableText label={text} value={stringValue} identity={interaction?.recordIdentity} disabled={disabled} onCommit={change} />;
    case "textarea": return <FormField label={text} description={typeof p.description === "string" ? p.description : undefined} required={p.required === true}>{control=><Field {...control} multiline label={text} value={stringValue} placeholder={content.detail} disabled={disabled} onValueChange={change}/>}</FormField>;
    case "checkbox": return <label className="ui-component-check"><Check label={text} checked={content.value === true} disabled={disabled} onCheckedChange={change} />{text}</label>;
    case "select": return <div className="ui-component-choice-field"><span>{text}</span>{p.presentation === "inline" ? <Choice presentation="inline" label={text} value={selected} options={options} onValueChange={value => change(options.find(option => option.id === value)?.label ?? "")} /> : <Choice presentation="popup" label={text} value={selected} options={options} disabled={disabled} onValueChange={value => change(options.find(option => option.id === value)?.label ?? "")} />}</div>;
    case "tabs": return <Tabs label={text} value={selected} options={options} tabId={value => `${id}-tab-${value}`} panelId={value => `${id}-panel-${value}`} onValueChange={value => { change(options.find(option => option.id === value)?.label ?? ""); const pages = p.pageIds; const destination = Array.isArray(pages) ? pages[Number(value)] : undefined; if (typeof destination === "string" && destination) interaction?.onNavigate(destination); else interaction?.onSelectItem(Number(value)); }} />;
    case "search": return <fieldset disabled={disabled}><Search label={text} query={stringValue} onQueryChange={change} /></fieldset>;
    case "number-field": return <NumberField label={text} value={typeof content.value === "number" ? content.value : null} min={typeof p.min==="number"?p.min:undefined} max={typeof p.max==="number"?p.max:undefined} precision={typeof p.precision==="number"?p.precision:undefined} unit={typeof p.unit==="string"?p.unit:undefined} required={p.required===true || content.bindings?.some(binding=>binding.target==="value")} disabled={disabled} onValueChange={next=>change(next??"")}/>;
    case "value-input": return <ValueInput label={text} value={typeof content.value === "number" ? content.value : 0} min={typeof p.min === "number" ? p.min : 0} max={typeof p.max === "number" ? p.max : 100} step={typeof p.step === "number" ? p.step : 1} presentation={p.presentation === "continuous" ? "continuous" : "stepped"} disabled={disabled} onValueChange={change} />;
    case "toggle": return <Toggle pressed={content.value === true} presentation={p.presentation === "chip" ? "chip" : "button"} disabled={disabled} onClick={() => change(content.value !== true)}>{text}</Toggle>;
    case "selectable-item": return <SelectableItem selected={content.value === true} disabled={disabled} onClick={() => change(content.value !== true)}>{text}</SelectableItem>;
    case "disclosure": return <><DisclosureButton expanded={p.expanded === true} controls={`${id}-body`} disabled={disabled} onClick={() => interaction?.onPropsChange({expanded: p.expanded !== true})}>{text}</DisclosureButton><div id={`${id}-body`} hidden={p.expanded !== true}>{content.detail}</div></>;
    default: return <fieldset disabled={disabled}><DateControl text={text} content={content} interaction={interaction} /></fieldset>;
  }
}

function DateControl({text, content, interaction}: UIComponentAdapterProps): ReactNode {
  const p = content.props ?? {};
  const value = typeof content.value === "string" ? content.value : "";
  const visibleDate = typeof p.visibleDate === "string" ? p.visibleDate : "2026-10-01";
  const grain: CalendarGrain = p.grain === "week" || p.grain === "year" ? p.grain : "month";
  const dateTypes: Record<string, HtmlDateType> = {"date-field": "date", "time-field": "time", "datetime-field": "datetime-local", "month-field": "month", "week-field": "week"};
  const change = (next: string) => interaction?.onValueChange(next);
  const range = {start: typeof p.start === "string" ? p.start : visibleDate, end: typeof p.end === "string" ? p.end : visibleDate};
  const common = {label: text, grain, visibleDate, onGrainChange: (next: CalendarGrain) => interaction?.onPropsChange({grain: next}), onVisibleDateChange: (next: string) => interaction?.onPropsChange({visibleDate: next})};
  if (dateTypes[content.component]) return <HtmlDateField type={dateTypes[content.component]!} label={text} value={value} onValueChange={change} />;
  if (content.component === "date-picker") return <DatePicker label={text} chooseLabel="날짜 선택" value={value} defaultVisibleDate={visibleDate} onValueChange={change} />;
  if (content.component === "date-range-picker") return <DateRangePicker label={text} value={range} onValueChange={next => interaction?.onPropsChange({...next})} />;
  if (content.component === "range-calendar") return <RangeCalendar {...common} value={typeof p.start === "string" ? range : null} onValueChange={next => interaction?.onPropsChange({...next})} />;
  if (content.component === "date-grid") return <DateGrid label={text} cells={calendarCells(grain, visibleDate)} grain={grain} focusDate={value || visibleDate} isDateSelected={date => date === value} onDateSelect={change} onDateMove={change} onFocusDateChange={date => interaction?.onPropsChange({visibleDate: date})} />;
  return <CalendarGrid {...common} value={value || null} onValueChange={change} />;
}
