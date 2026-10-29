import { useState, type ReactNode } from "react";
import { DatabaseHand } from "@interactive-os/json-document-database";
import { RecordFacts, SemanticIcon, StateIndicator, PriorityIndicator, type SemanticIconKind, IssueRow, StatusBadge, SelectableItem, contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import type { DatabaseDocument, UIBuilderCollectionProjection } from "@interactive-os/json-document-editing";
import type { UIComponentContent } from "@interactive-os/json-document-object-document";
import type { UIComponentInteraction } from "./ui-component-view.js";
import {UIComponentRecordCard} from "./ui-component-record-card.js";
/** One formatter serves field lists and feed presentation. */
function formatCollectionFieldValue(field: DatabaseDocument["schema"]["properties"][number], value: unknown): string {
  return field.type === "select" ? field.options.find(option => option.id === value)?.name ?? ""
    : typeof value === "boolean" ? value ? "예" : "아니요" : String(value ?? "—");
}

/** Database owns table keyboard/cells/filter/sort; this adapter maps named fields and shared selection. */
export function UIComponentCollection({text,content,projection,interaction,renderChildren}: {text:string; content:UIComponentContent; projection?:UIBuilderCollectionProjection | undefined; interaction?:UIComponentInteraction | undefined; renderChildren?: ((ids: readonly string[]) => ReactNode) | undefined}): ReactNode {
  const [view, setView] = useState<DatabaseDocument["views"][number] | null>(null);
  if (!projection) return <p role="status">연결할 데이터 컬렉션을 선택하세요.</p>;
  if (content.component === "record-card") {
    const childIds = content.childIds ?? [];
    const count = Math.max(0, Math.min(childIds.length, Math.floor(Number(content.props?.actionCount) || 0)));
    return <UIComponentRecordCard content={content} projection={projection} actions={count ? renderChildren?.(childIds.slice(-count)) : undefined}>{renderChildren?.(count ? childIds.slice(0, -count) : childIds)}</UIComponentRecordCard>;
  }
  const document = {...projection.document, views: [view ?? projection.document.views[0]!]};
  const outsideQueryMessage = projection.selectionOutsideQuery ? "선택한 항목은 현재 목록 조건에 포함되지 않습니다." : "";
  if (content.component === "record-list" && document.records.length === 0) return <section aria-label={text} className={contentPresentation.group}><h2 className={contentPresentation.heading}>{text}</h2><p role="status" className={contentPresentation.caption}>표시할 항목이 없습니다.{outsideQueryMessage && ` ${outsideQueryMessage}`}</p></section>;
  if (content.component === "detail-list" || content.component === "record-list") {
    const records = content.component === "detail-list" ? document.records.filter(record => record.id === projection.selectedRecordId) : document.records;
    const fields = projection.fieldIds.map(id => document.schema.properties.find(field => field.id === id)!);
    const renderFields = (record: DatabaseDocument["records"][number]) => <RecordFacts presentation="list" items={fields.map(field=>({id:field.id,label:field.name,value:formatCollectionFieldValue(field,record.values[field.id])}))}/>;
    if (content.component === "detail-list") return <section className={contentPresentation.group} aria-label={text}>
      <h2 className={contentPresentation.heading}>{text}</h2>
      {records.length ? records.map(record => <div key={record.id}>{renderFields(record)}</div>) : <p role="status" className={contentPresentation.caption}>항목을 선택하세요.</p>}
    </section>;
    const roleValue = (record: DatabaseDocument["records"][number], role: string, fallback?: number) => {
      const fieldId = content.props?.[`${role}FieldId`];
      const field = typeof fieldId === "string" ? document.schema.properties.find(field => field.id === fieldId) : fallback === undefined ? undefined : fields[fallback];
      return field ? formatCollectionFieldValue(field, record.values[field.id]) : undefined;
    };
    const roleFlag = (record: DatabaseDocument["records"][number], role: string) => {
      const id = content.props?.[`${role}FieldId`];
      return typeof id === "string" && record.values[id] === true;
    };
    const feed = content.component === "record-list" && content.props?.presentation === "feed";
    return <section className={contentPresentation.group} aria-label={text}>
      <h2 className={contentPresentation.heading}>{text}</h2>
      {outsideQueryMessage && <p role="status" className={contentPresentation.caption}>{outsideQueryMessage}</p>}
      <ul className={contentPresentation.list}>{records.map(record => <li key={record.id}>
        {feed ? <IssueRow leading={typeof content.props?.itemKind === "string" ? <SemanticIcon kind={content.props.itemKind as SemanticIconKind}/> : undefined} indicators={<>{roleFlag(record,"unread") && <StateIndicator state="unread" label="읽지 않음"/>}{roleFlag(record,"completed") && <StateIndicator state="complete" label="완료"/>}{roleFlag(record,"overdue") && <StateIndicator state="overdue" label="기한 초과"/>}</>} title={roleValue(record, "title", 0)} summary={roleValue(record, "summary")} identifier={roleValue(record, "identifier")} status={<>{roleValue(record, "status") && <StatusBadge>{roleValue(record, "status")}</StatusBadge>}{roleValue(record,"priority") && <PriorityIndicator label={roleValue(record,"priority")!} level="normal"/>}</>} assignee={roleValue(record, "assignee")} updatedAt={roleValue(record, "updatedAt")} selected={record.id === projection.selectedRecordId} disabled={interaction?.busy} onSelect={() => interaction?.onSelectRecord(record.id)} /> : <SelectableItem selected={record.id === projection.selectedRecordId} aria-pressed={record.id === projection.selectedRecordId} disabled={interaction?.busy} onClick={() => interaction?.onSelectRecord(record.id)}>
          {renderFields(record)}
        </SelectableItem>}
      </li>)}</ul>
    </section>;
  }
  return <section aria-label={text} className={contentPresentation.group}><h2 className={contentPresentation.heading}>{text}</h2>{outsideQueryMessage && <p role="status" className={contentPresentation.caption}>{outsideQueryMessage}</p>}<DatabaseHand document={document} selectedRecordId={projection.selectedRecordId} viewId={document.views[0]!.id} onDocumentChange={(next,change) => {setView(next.views[0]!); if (change.origin !== "view.configure" && content.props?.editable === true && content.props?.readOnly !== true) interaction?.onCollectionChange(next);}} readOnly={content.props?.editable !== true || content.props?.readOnly === true || interaction?.busy} presentation={{showRecordIds:false,showPropertyTypes:false,propertyOrder:projection.fieldIds}} features={{create:false,delete:false,history:false,filter:true,columns:false}} onSelectionChange={ids => {if (ids[0]) interaction?.onSelectRecord(ids[0]);}} labels={{ariaLabel:text,filter:"필터",columns:"열",empty:"표시할 데이터가 없습니다."}} /></section>;
}
