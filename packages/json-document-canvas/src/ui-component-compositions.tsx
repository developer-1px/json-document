import {uiComponentSlotIds} from "@interactive-os/json-document-object-document";
import { useUIScreenEditTranslation } from "./ui-screen-edit-layer.js";
import { GripVertical } from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {ContentGroup, Tag, TagGroup, TagPicker, RecordFacts, DateRangeDisplay, CommentComposer, Choice, PageHeader, SidebarNavigation, Avatar, PersonIdentity, PriorityIndicator, DateDisplay, QuantityDisplay, MoneyDisplay, EmptyState, InlineAlert, Stepper, ActivityFeed, PeoplePicker, FilterBar, StatusBadge, PropertyEditor, ResultPanel, RecordWorkspace, ProductShell, ProductCanvas, ProductInspector, Toolbar, ToolbarGroup, ToolbarLayout, ToolbarRegion, ToolbarSeparator, ToolbarSpacer, ContextualControls, Popover, Dialog, Menu, DisclosureButton, SelectableItem, ChatBubble, ChatActivity, FileDropRegion, DragHandle, ControlHandle, ResizeHandle, Command, contentPresentation, floatingSurface, GridCell } from "@interactive-os/json-document-ui-primitives-react";
import { formatFileSize } from "@interactive-os/json-document-file-intake";
import { CalendarMonthGrid, CalendarTimeGrid, CalendarEventInspector, useCalendarHand, useCalendarPointerInteractions, calendarCells, calendarMonthWeeks, addCalendarDays, calendarPresentation } from "@interactive-os/json-document-calendar";
import { validateCalendarDocument, type CalendarDocument } from "@interactive-os/json-document-calendar-document";
import { createCalendarEditor, calendarOccurrenceTopology } from "@interactive-os/json-document-editing";
import type { UIComponentContent } from "@interactive-os/json-document-object-document";
import type { UIComponentInteraction } from "./ui-component-view.js";

export interface UIComponentCompositionProps {
  readonly text: string;
  readonly content: UIComponentContent;
  readonly interaction?: UIComponentInteraction | undefined;
  readonly renderChildren?: ((ids: readonly string[]) => ReactNode) | undefined;
  readonly collection?: ReactNode;
}
/** Composition adapters preserve the public primitive's focus, dismiss and pointer lifecycle. */
export function UIComponentComposition({text, content, interaction, renderChildren, collection}: UIComponentCompositionProps): ReactNode {
  const properties = content.props ?? {};
  const viewportOffset = useUIScreenEditTranslation();
  const [open, setOpen] = useState(properties.open === true || properties.expanded === true);
  const [selected, setSelected] = useState(properties.selected === true);
  useEffect(() => {setOpen(properties.open === true || properties.expanded === true);}, [properties.open, properties.expanded]);
  useEffect(() => {setSelected(properties.selected === true);}, [properties.selected]);
  const id = useId();
  const children = content.childIds?.length ? renderChildren?.(content.childIds) : undefined;
  const changeOpen = (value: boolean) => { setOpen(value); interaction?.onPropsChange?.({open: value}); };
  const ids = (key: string): string[] => Array.isArray(properties[key]) ? properties[key].filter((value): value is string => typeof value === "string") : [];
  switch (content.component) {
    case "page-header": return <PageHeader level={properties.level === 2 ? 2 : 1} titleRole={properties.titleRole === "primary" ? "primary" : "section"} title={text} description={content.detail || undefined} actions={children} />;
    case "sidebar-navigation": return <SidebarNavigation label={text} currentId={typeof properties.currentPageId === "string" ? properties.currentPageId : undefined} groups={[{id:"pages",items:content.items.map((label,index)=>({id:ids("pageIds")[index] ?? String(index),label,href:`#${ids("pageIds")[index] ?? ""}`}))}]} onNavigate={id=>interaction?.onNavigate(id)} />;
    case "avatar": return <Avatar name={text} src={typeof properties.src === "string" ? properties.src : undefined} />;
    case "person-identity": return <PersonIdentity name={text} src={typeof properties.src === "string" ? properties.src : undefined} />;
    case "priority-indicator": return <PriorityIndicator label={text} level={properties.level === "low" || properties.level === "high" ? properties.level : "normal"} />;
    case "quantity-display": return <div className={contentPresentation.group}>{text && <span className={contentPresentation.caption}>{text}</span>}<QuantityDisplay value={content.detail.trim() !== "" && Number.isFinite(Number(content.detail)) ? Number(content.detail) : null} unit={typeof properties.unit === "string" ? properties.unit : ""} locale={typeof properties.locale === "string" ? properties.locale : undefined} /></div>;
    case "money-display": return <div className={contentPresentation.group}>{text && <span className={contentPresentation.caption}>{text}</span>}<MoneyDisplay value={content.detail.trim() !== "" && Number.isFinite(Number(content.detail)) ? Number(content.detail) : null} currency={typeof properties.currency === "string" ? properties.currency : ""} locale={typeof properties.locale === "string" ? properties.locale : undefined} /></div>;
    case "tag": return <Tag>{text}</Tag>;
    case "tag-group": return <TagGroup label={text} items={content.items.map((label,index)=>({id:String(index),label}))}/>;
    case "tag-picker": {
      const options=properties.options && typeof properties.options === "object" && !Array.isArray(properties.options) && "items" in properties.options ? properties.options.items : [];
      return <TagPicker label={text} options={Array.isArray(options) ? options.flatMap(option=>option && typeof option==="object" && !Array.isArray(option) && typeof option.id==="string" && typeof option.label==="string" ? [{id:option.id,label:option.label,disabled:option.disabled===true}] : []) : []} value={ids("selectedIds")} disabled={interaction?.busy || properties.disabled===true} onValueChange={selectedIds=>interaction?.onPropsChange({selectedIds:[...selectedIds]})}/>;
    }
    case "date-range-display": return <DateRangeDisplay start={typeof properties.start==="string"?properties.start:""} end={typeof properties.end==="string"?properties.end:""}/>;
    case "comment-composer": return <CommentComposer label={text} identity={interaction?.recordIdentity ?? id} submitLabel={typeof properties.submitLabel==="string"?properties.submitLabel:undefined} disabled={interaction?.busy || properties.disabled===true || !interaction?.onAppendActivity || typeof properties.targetId!=="string" || !properties.targetId || typeof properties.actor!=="string" || !properties.actor.trim()} onSubmit={body=>{if(interaction?.onAppendActivity?.(body)===false) throw new Error("기록을 추가하지 못했습니다.");}}/>;
    case "record-facts": return <RecordFacts label={text} presentation={properties.presentation==="grid"?"grid":"list"} items={(content.childIds??[]).map((id,index)=>({id,label:ids("labels")[index]??"",value:renderChildren?.([id])}))}/>;
    case "date-display": return <DateDisplay value={typeof properties.dateTime === "string" ? properties.dateTime : ""} overdue={properties.overdue === true}>{text}</DateDisplay>;
    case "empty-state": return <EmptyState title={text} description={content.detail || undefined} actions={children} />;
    case "inline-alert": return <InlineAlert title={text} tone={properties.tone === "error" || properties.tone === "success" ? properties.tone : "info"} actions={children}>{content.detail || undefined}</InlineAlert>;
    case "stepper": return <Stepper label={text} steps={content.items.map((label,index)=>({id:String(index),label,state:index < Number(properties.currentIndex ?? 0) ? "complete" : index === Number(properties.currentIndex ?? 0) ? "current" : "pending"}))} />;
    case "activity-feed": {
      const entries = properties.entries && typeof properties.entries === "object" && !Array.isArray(properties.entries) && "items" in properties.entries ? properties.entries.items : [];
      return <ActivityFeed label={text} presentation={properties.presentation === "timeline" ? "timeline" : "list"} entries={Array.isArray(entries) ? entries.flatMap((entry,index)=>entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.actor === "string" && typeof entry.action === "string" && typeof entry.dateTime === "string" && typeof entry.timeLabel === "string" ? [{id:typeof entry.id === "string" ? entry.id : String(index),actor:entry.actor,action:entry.action,dateTime:entry.dateTime,timeLabel:entry.timeLabel,detail:typeof entry.detail === "string" ? entry.detail : undefined}] : []) : []} empty={<EmptyState title={text} description={content.detail || undefined} />} />;
    }
    case "people-picker": {
      const candidates=properties.people && typeof properties.people==="object" && !Array.isArray(properties.people) && "items" in properties.people ? properties.people.items : undefined;
      const people=Array.isArray(candidates) ? candidates.flatMap(person=>person && typeof person==="object" && !Array.isArray(person) && typeof person.id==="string" && typeof person.name==="string" ? [{id:person.id,name:person.name,src:typeof person.src==="string"?person.src:undefined,description:typeof person.description==="string"?person.description:undefined,disabled:person.disabled===true}] : []) : content.items.map(name=>({id:name,name}));
      return <PeoplePicker label={text} people={people} value={typeof content.value === "string" ? content.value : ""} disabled={interaction?.busy || properties.disabled === true} onValueChange={id=>interaction?.onValueChange(id)} />;
    }
    case "filter-bar": return <FilterBar label={text} filters={typeof content.value === "string" && content.value && content.value !== "전체" ? [{id:content.value,label:content.value}] : []} resultCount={typeof properties.resultCount === "number" ? properties.resultCount : undefined} onRemove={()=>interaction?.onValueChange("")} onReset={()=>interaction?.onValueChange("")}>{content.items.length > 0 && <Choice label={text} presentation="popup" value={String(content.value ?? "")} options={[{id:"",label:"전체"},...content.items.filter(value=>value!=="전체").map(label=>({id:label,label}))]} onValueChange={value=>interaction?.onValueChange(value)} />}{children}</FilterBar>;
    case "status-badge": return <StatusBadge tone={properties.tone === "active" || properties.tone === "success" || properties.tone === "attention" ? properties.tone : "neutral"}>{text}</StatusBadge>;
    case "result-panel": {
      const count = Math.max(0, Math.min(content.childIds?.length ?? 0, Number(properties.actionCount) || 0));
      const ids = content.childIds ?? [];
      const body = renderChildren?.(ids.slice(0, ids.length - count));
      return <ResultPanel title={text} actions={count ? renderChildren?.(ids.slice(-count)) : undefined} empty={typeof properties.emptyMessage === "string" ? properties.emptyMessage : undefined}>{content.detail || ids.length > count ? <>{content.detail && <p className={contentPresentation.body}>{content.detail}</p>}{body}</> : undefined}</ResultPanel>;
    }
    case "property-editor": return <PropertyEditor label={text} items={(content.childIds ?? []).map((id, index) => ({id, label: typeof properties.labels === "object" && Array.isArray(properties.labels) && typeof properties.labels[index] === "string" ? properties.labels[index] as string : "", value: renderChildren?.([id])}))} />;
    case "title": return <h1 className={contentPresentation.title}>{text}</h1>;
    case "caption": return <p className={contentPresentation.caption}>{text}</p>;
    case "group": return <ContentGroup label={text} relationship={properties.relationship === "related" || properties.relationship === "region" ? properties.relationship : "group"}>{children}</ContentGroup>;
    case "record-workspace": {
      const slots = uiComponentSlotIds(content);
      const slot = (index: number) => slots[index] ? renderChildren?.([slots[index]!]) : undefined;
      return <RecordWorkspace hasSelection={properties.tableId ? !!interaction?.recordIdentity : true} header={slot(0)} listHeader={slot(1)} list={slot(2)} detailHeader={slot(3)} detail={slot(4)} properties={slot(5)} />;
    }
    case "product-shell": return <ProductShell toolbar={renderChildren?.(ids("toolbarIds"))} inspector={renderChildren?.(ids("inspectorIds"))} toolbarLabel={text} toolbarPresentation={properties.toolbarPresentation === "floating" ? "floating" : "attached"} fill={properties.fill === true}>{children}</ProductShell>;
    case "product-canvas": return <ProductCanvas>{children}</ProductCanvas>;
    case "product-inspector": {
      const count = Math.max(0, Math.min(content.childIds?.length ?? 0, Number(properties.footerCount) || 0));
      const childIds = content.childIds ?? [];
      return <ProductInspector aria-label={text} heading={text} open={properties.open !== false} presentation={properties.presentation === "floating" ? "floating" : "attached"} footer={count ? renderChildren?.(childIds.slice(-count)) : undefined}>{renderChildren?.(childIds.slice(0, childIds.length-count))}</ProductInspector>;
    }
    case "toolbar": return <Toolbar label={text}>{children}</Toolbar>;
    case "toolbar-group": return <ToolbarGroup label={text}>{children}</ToolbarGroup>;
    case "toolbar-layout": return <ToolbarLayout>{children}</ToolbarLayout>;
    case "toolbar-region": return <ToolbarRegion label={text} placement={properties.placement === "center" || properties.placement === "end" ? properties.placement : "start"}>{children}</ToolbarRegion>;
    case "toolbar-separator": return <ToolbarSeparator />;
    case "toolbar-spacer": return <ToolbarSpacer />;
    case "contextual-controls": return <ContextualControls selected={properties.selected === true} editing={properties.editing === true} revealWithoutHover capabilities={(content.childIds ?? []).map(id => ({id, phases: ["approach", "selected", "editing"]}))}>{snapshot => <>{content.detail && <p className={contentPresentation.body}>{content.detail}</p>}{renderChildren?.(snapshot.visible)}</>}</ContextualControls>;
    case "popover": return <Popover label={text} trigger={text} dismissBoundary={interaction?.dismissBoundary} open={open} onOpenChange={changeOpen} panelClassName={floatingSurface.panel}>{children ?? content.detail}</Popover>;
    case "dialog": return <><Command onClick={() => changeOpen(true)}>{text}</Command><Dialog label={text} inert={interaction?.editing} viewportOffset={interaction?.dismissBoundary ? viewportOffset : undefined} dismissBoundary={interaction?.dismissBoundary} open={open} onOpenChange={changeOpen} presentation={properties.presentation === "sheet" ? "sheet" : "modal"} className={floatingSurface.panel}>{children ?? content.detail}<Command onClick={() => changeOpen(false)}>닫기</Command></Dialog></>;
    case "menu": return <Menu label={text} trigger={text} items={content.items.map((label, index) => ({id: String(index), label}))} onAction={value => {const index = Number(value); const target = ids("targetPageIds")[index]; if (target) interaction?.onNavigate?.(target); else interaction?.onItemAction?.(index);}} />;
    case "disclosure": return <><DisclosureButton controls={id} expanded={open} onClick={() => {setOpen(!open); interaction?.onPropsChange?.({expanded: !open});}}>{text}</DisclosureButton>{open && <section id={id}>{children ?? content.detail}</section>}</>;
    case "selectable-item": return <SelectableItem selected={selected} aria-pressed={selected} onClick={() => {setSelected(!selected); interaction?.onPropsChange?.({selected: !selected}); interaction?.onAction();}}>{text}{children}</SelectableItem>;
    case "chat-bubble": return <ChatBubble label={text} direction={properties.direction === "outgoing" ? "outgoing" : "incoming"}>{children ?? (content.detail || text)}</ChatBubble>;
    case "chat-activity": return <ChatActivity label={text} />;
    case "file-drop": return <FileDropRegion aria-label={text} onFiles={files => interaction?.onFiles?.(files)} overlay={<p role="status">{text}</p>}>{children ?? <p>{text}</p>}{Array.isArray(properties.files) && properties.files.map((value, index) => typeof value === "object" && value !== null && !Array.isArray(value) && typeof value.name === "string" && typeof value.size === "number" ? <p key={index} className={contentPresentation.caption}>{value.name} · {formatFileSize(value.size)}</p> : null)}</FileDropRegion>;
    case "drag-handle": return <DragHandle label={text} onHandle={event => interaction?.onHandle?.(event)}><GripVertical size={16} aria-hidden="true" /></DragHandle>;
    case "control-handle": return <ControlHandle label={text} onHandle={event => interaction?.onHandle?.(event)} />;
    case "resize-handle": return <ResizeHandle label={text} orientation={properties.orientation === "vertical" ? "vertical" : "horizontal"} onResize={(delta, phase) => interaction?.onResize?.(delta, phase)} />;
    case "grid-cell": return <table role="grid" aria-label={text}><tbody><tr><GridCell selected={content.value === true} tabIndex={0} onClick={() => interaction?.onValueChange(content.value !== true)}>{text}{content.detail}</GridCell></tr></tbody></table>;
    case "table":
    case "record-card":
    case "record-list":
    case "detail-list": return collection ?? <p role="status" className={contentPresentation.caption}>연결할 데이터 컬렉션을 선택하세요.</p>;
    case "calendar-month":
    case "calendar-time":
    case "calendar-event-inspector": return <CalendarComposition text={text} content={content} interaction={interaction} />;
    default: return null;
  }
}

function CalendarComposition({text, content, interaction}: UIComponentCompositionProps) {
  const document = content.props?.calendar;
  if (!document || !validateCalendarDocument(document).ok) return <p role="status" className={contentPresentation.caption}>일정 데이터를 연결하세요.</p>;
  return <CalendarDocumentComposition text={text} content={content} document={document as CalendarDocument} interaction={interaction} />;
}
function CalendarDocumentComposition({text, content, document, interaction}: UIComponentCompositionProps & {document: CalendarDocument}) {
  const editor = useMemo(() => createCalendarEditor(document, {initialEventIds: content.component === "calendar-event-inspector" ? document.events.slice(0, 1).map(event => event.id) : []}), [document, content.component]);
  const hand = useCalendarHand(editor, {defaultTitle: "새 일정"});
  useEffect(() => editor.subscribe(snapshot => {if (snapshot.value !== document) interaction?.onPropsChange?.({calendar: snapshot.value});}), [editor, document, interaction]);
  const interactions = useCalendarPointerInteractions(hand, {hourStart: 7, hourEnd: 19, stepMinutes: 15, pixelsPerHour: 48});
  const date = typeof content.props?.visibleDate === "string" ? content.props.visibleDate : document.events[0]?.start.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const weekdays = ["월", "화", "수", "목", "금", "토", "일"];
  const getEventColor = (event: {calendarId: string}) => document.calendars.find(calendar => calendar.id === event.calendarId)?.color ?? "";
  if (content.component === "calendar-event-inspector") return <CalendarEventInspector hand={hand} calendars={document.calendars} classNames={calendarPresentation.inspector} affordances={{inspector: "stateful", edit: "content-control", remove: "content-control", titleField: "stateful", allDayToggle: "stateful", startField: "stateful", endField: "stateful", calendarChoice: "stateful", recurrenceChoice: "stateful", recurrenceInterval: "stateful"}} labels={{inspector: text, title: "제목", edit: "일정 수정", remove: "삭제", allDay: "종일", allDaySummary: "종일", start: "시작", end: "종료", calendar: "캘린더", repeat: "반복", repeats: "반복 일정", none: "반복 없음", daily: "매일", weekly: "매주", monthly: "매월", yearly: "매년", every: "간격", repeatEvery: "반복 간격", repeatUntil: "반복 종료", editOccurrence: "수정 범위", thisOccurrence: "이 일정", followingOccurrences: "이후 일정", allOccurrences: "모든 일정"}} />;
  if (content.component === "calendar-month") {
    const weeks = calendarMonthWeeks(date);
    const start = weeks[0]?.[0]?.date ?? date;
    const end = addCalendarDays(weeks.at(-1)?.at(-1)?.date ?? date, 1);
    return <CalendarMonthGrid visibleDate={date} today={today} events={hand.paintedEvents} weekdays={weekdays} rowLimit={2} hand={hand} interactions={interactions} selectionTopology={calendarOccurrenceTopology(hand.document, start, end)} affordances={{dateCell: "content-control", event: "direct", eventResizeEnd: "direct", moreDisclosure: "content-control", overflowDate: "content-control", overflowEvent: "direct"}} classNames={calendarPresentation.month} labels={{grid: text, overflow: date => `${date} 일정`, more: count => `${count}개 더 보기`, resizeEnd: event => `${event.title} 종료 변경`}} getEventColor={getEventColor} onNavigateDate={visibleDate => interaction?.onPropsChange?.({visibleDate})} />;
  }
  const cells = calendarCells(Number(content.props?.days) === 1 ? "day" : "week", date);
  return <CalendarTimeGrid cells={cells} weekdays={weekdays} events={hand.paintedEvents} today={today} nowInstant={new Date().toISOString().slice(0,16)} hourStart={7} hourEnd={19} workHourStart={9} stepMinutes={15} defaultTimedDurationMinutes={60} pixelsPerHour={48} fillViewport={false} hand={hand} interactions={interactions} selectionTopology={calendarOccurrenceTopology(hand.document, cells[0]?.date ?? date, addCalendarDays(cells.at(-1)?.date ?? date,1))} affordances={{allDayCell: "content-control", allDayEvent: "direct", eventResizeEnd: "direct", timeCell: "content-control", selectedSlot: "stateful", timedEvent: "direct"}} classNames={calendarPresentation.time} labels={{grid: text, allDay: "종일", now: "현재", resizeEnd: event => `${event.title} 종료 변경`, hour: hour => `${hour}시`}} getEventColor={getEventColor} />;
}
