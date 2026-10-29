import type {ReactNode} from "react";
import {ContentCard} from "./content-card.js";
import {SelectableItem} from "./controls.js";
import {RecordFacts, RecordSummary} from "./record-affordances.js";
import {Check} from "./input-controls.js";

export type StatusBadgeTone = "neutral" | "active" | "success" | "attention";
/** Read-only state, never a disguised state-changing control. */
export function StatusBadge({children, icon, tone = "neutral"}: {readonly children: ReactNode; readonly icon?: ReactNode; readonly tone?: StatusBadgeTone}): ReactNode {
  return <span data-ui-component="status-badge" data-tone={tone}>{icon}{children}</span>;
}
export interface IssueRowSelection {
  readonly label: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
}
export interface IssueRowProps {
  readonly title: ReactNode;
  readonly summary?: ReactNode;
  readonly identifier?: ReactNode;
  readonly status?: ReactNode;
  readonly assignee?: ReactNode;
  readonly updatedAt?: ReactNode;
  readonly leading?: ReactNode;
  readonly indicators?: ReactNode;
  readonly selected?: boolean;
  readonly disabled?: boolean | undefined;
  /** Collection membership is independent of the record currently opened in detail. */
  readonly selection?: IssueRowSelection;
  /** Independent commands stay outside the primary selection button. */
  readonly actions?: ReactNode;
  readonly onSelect: () => void;
}
/** Selection, opening a record, and row commands have separate targets and keyboard stops. */
export function IssueRow({title, summary, identifier, status, assignee, updatedAt, leading, indicators, selected = false, disabled, selection, actions, onSelect}: IssueRowProps): ReactNode {
  return <div data-ui-component="issue-row">
    {selection && <span data-issue-region="selection"><Check {...selection} disabled={disabled}/></span>}
    <SelectableItem type="button" selected={selected} aria-pressed={selected} disabled={disabled} onClick={onSelect}>
      <RecordSummary title={title} leading={leading} indicators={indicators} status={status} summary={summary} metadata={[identifier,assignee,updatedAt].some(value=>value!=null) ? <>{identifier != null && <span>{identifier}</span>}{assignee != null && <span>{assignee}</span>}{updatedAt != null && <span>{updatedAt}</span>}</> : undefined}/>
    </SelectableItem>
    {actions && <span data-issue-region="actions">{actions}</span>}
  </div>;
}
export interface PropertyEditorItem {
  readonly id: string;
  readonly label: string;
  /** A read-only value or an existing labelled Field/Choice/DatePicker. */
  readonly value: ReactNode;
}
/** Compatibility name. RecordFacts owns the structure; each injected input owns editing. */
export function PropertyEditor({label, items}: {readonly label: string; readonly items: readonly PropertyEditorItem[]}): ReactNode {
  return <RecordFacts label={label} presentation="list" items={items}/>;
}
/** Compatibility recipe, not an independent surface implementation. New compositions use ContentCard. */
export function ResultPanel({title, children, actions, empty}: {readonly title: ReactNode; readonly children?: ReactNode; readonly actions?: ReactNode; readonly empty?: ReactNode}): ReactNode {
  return <ContentCard title={title} actions={actions} empty={empty}>{children}</ContentCard>;
}
