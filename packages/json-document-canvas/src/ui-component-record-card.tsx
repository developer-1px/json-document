import type {ReactNode} from "react";
import {PersonCard, EventCard, FileCard, InquiryCard, TaskCard, ProductCard, ApprovalCard, ActivityCard, EvidenceCard, StatusBadge, DateDisplay, PriorityIndicator, contentPresentation} from "@interactive-os/json-document-ui-primitives-react";
import type {UIComponentContent} from "@interactive-os/json-document-object-document";
import type {UIBuilderCollectionProjection} from "@interactive-os/json-document-editing";

/** Maps selected record facts into public domain compositions; no local card styling or behavior. */
export function UIComponentRecordCard({content, projection, children, actions}: {readonly content: UIComponentContent; readonly projection: UIBuilderCollectionProjection; readonly children?: ReactNode; readonly actions?: ReactNode}): ReactNode {
  const record = projection.document.records.find(record => record.id === projection.selectedRecordId);
  if (!record) return <p role="status" className={contentPresentation.caption}>항목을 선택하세요.</p>;
  const props = content.props ?? {};
  const value = (role: string): unknown => {
    const id = props[`${role}FieldId`];
    const field = projection.document.schema.properties.find(field => field.id === id);
    if (!field) return undefined;
    const raw = record.values[field.id];
    return field.type === "select" ? field.options.find(option => option.id === raw)?.name : raw;
  };
  const text = (role: string) => { const raw = value(role); return raw == null || raw === "" ? undefined : String(raw); };
  const number = (role: string) => {const raw = value(role); return typeof raw === "number" && Number.isFinite(raw) ? raw : null;};
  const date = (role: string) => {const raw = text(role); return raw ? <DateDisplay value={raw}>{text("timeLabel") ?? raw}</DateDisplay> : undefined;};
  const flag = (role: string) => value(role) === true;
  const priority = text("priority") ? <PriorityIndicator label={text("priority")!} level="normal"/> : undefined;
  const status = text("status");
  const shared = {title: text("title") ?? "이름 없음", identifier: text("identifier"), status: status ? <StatusBadge>{status}</StatusBadge> : undefined, children, actions};
  switch (props.presentation) {
    case "person": return <PersonCard {...shared} name={text("title") ?? "이름 없음"} role={text("role")} organization={text("organization")} contact={text("contact")}/>;
    case "event": return <EventCard {...shared} schedule={date("schedule")} location={text("location")} participants={text("participants")} agenda={text("agenda")}/>;
    case "file": return <FileCard {...shared} format={text("format")} size={text("size")} updated={date("updated")} preview={text("preview")} owner={text("owner")}/>;
    case "inquiry": return <InquiryCard {...shared} presentation={props.messagePresentation === "conversation" ? "conversation" : "correspondence"} body={text("body")} customer={text("customer")} priority={priority} unread={flag("unread")}/>;
    case "task": return <TaskCard {...shared} summary={text("summary")} assignee={text("assignee")} due={date("due")} priority={priority} completed={flag("completed")} overdue={flag("overdue")} flagged={flag("flagged")}/>;
    case "product": return <ProductCard {...shared} category={text("category")} quantity={props.quantityFieldId ? {value: number("quantity"), unit: String(props.unit ?? "")} : undefined} price={props.priceFieldId ? {value: number("price"), currency: String(props.currency ?? "")} : undefined} note={text("note")}/>;
    case "approval": return <ApprovalCard {...shared} change={text("change")} requester={text("requester")} requestedAt={date("requestedAt")} changed={flag("changed")} comparison={props.beforeFieldId && props.afterFieldId ? [{id:"change",label:"변경 내용",before:text("before") ?? "—",after:text("after") ?? "—"}] : undefined}/>;
    case "activity": return <ActivityCard {...shared} actor={text("actor")} dateTime={text("dateTime") ?? ""} timeLabel={text("timeLabel") ?? text("dateTime") ?? ""} subject={text("subject")} detail={text("body")}/>;
    case "result": return <EvidenceCard {...shared} body={text("body")} source={text("source")} empty={<span className={contentPresentation.caption}>아직 결과가 없습니다.</span>}/>;
    default: return <p role="status">카드의 도메인 표현을 선택하세요.</p>;
  }
}
