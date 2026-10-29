import type {ReactNode} from "react";
import {MessageSquare, ClipboardList, Package, GitCompareArrows, History, FileText, UserRound, CalendarClock, BookOpen, Check, CircleDashed, Circle, CircleDot, AlertCircle, Link, Paperclip, Flag, ArrowUpDown, CalendarDays, MapPin, Users, Mail} from "lucide-react";
import {ChatBubble} from "./chat-bubble.js";
import {contentPresentation} from "./content-presentation.js";

/** One existing icon library, selected by meaning rather than arbitrary icon names or emoji. */
const icons = {message:MessageSquare, task:ClipboardList, product:Package, change:GitCompareArrows, activity:History, result:FileText, person:UserRound, deadline:CalendarClock, source:BookOpen, complete:Check, running:CircleDashed, unread:Circle, overdue:AlertCircle, changed:CircleDot, link:Link, attachment:Paperclip, priority:ArrowUpDown, flag:Flag, event:CalendarDays, location:MapPin, participants:Users, email:Mail, file:FileText};
export type SemanticIconKind = keyof typeof icons;
export function SemanticIcon({kind, label}: {readonly kind: SemanticIconKind; readonly label?: string | undefined}): ReactNode {
  const Icon = icons[kind];
  return <Icon data-ui-semantic-icon={kind} size={16} aria-hidden={label ? undefined : true} role={label ? "img" : undefined} aria-label={label}/>;
}
export type StateIndicatorState = "unread" | "changed" | "running" | "overdue" | "complete";
/** A known fact, never a clickable control or an inferred workflow transition. */
export function StateIndicator({state, label}: {readonly state: StateIndicatorState; readonly label: string}): ReactNode {
  return <span data-ui-component="state-indicator" data-state={state} role="img" aria-label={label} title={label}><SemanticIcon kind={state}/></span>;
}
export interface RecordSummaryProps {
  readonly title: ReactNode;
  readonly leading?: ReactNode;
  readonly status?: ReactNode;
  readonly indicators?: ReactNode;
  readonly summary?: ReactNode;
  readonly metadata?: ReactNode;
  readonly headingLevel?: 2 | 3;
}
/** Read-only summary anatomy also used inside the existing selectable IssueRow. */
export function RecordSummary({title,leading,status,indicators,summary,metadata,headingLevel}: RecordSummaryProps): ReactNode {
  return <span data-ui-component="record-summary">
    <span data-record-summary="heading"><span data-record-summary="identity">{leading}<span className={contentPresentation.itemTitle} role={headingLevel ? "heading" : undefined} aria-level={headingLevel}>{title}</span>{indicators}</span>{status && <span data-record-context="">{status}</span>}</span>
    {summary != null && <span className={contentPresentation.itemSummary}>{summary}</span>}
    {metadata != null && <span data-record-summary="metadata" className={contentPresentation.caption}>{metadata}</span>}
  </span>;
}
export interface ThreadMessage {readonly id:string; readonly sender:ReactNode; readonly body:ReactNode; readonly direction:"incoming"|"outgoing"; readonly dateTime?:string; readonly timeLabel?:string;}
export interface RecordDetailProps {
  readonly header?:ReactNode;
  readonly children?:ReactNode;
  readonly supplementary?:ReactNode;
  readonly actions?:ReactNode;
}
/** Reading/editing content uses the same structural slots; input behavior stays with controls. */
export function RecordDetail({header,children,supplementary,actions}:RecordDetailProps):ReactNode {
  return <section data-ui-component="record-detail" className={contentPresentation.group}>
    {header != null && <header>{header}</header>}
    {children}
    {supplementary != null && <aside data-record-detail="supplementary">{supplementary}</aside>}
    {actions != null && <footer data-record-actions="">{actions}</footer>}
  </section>;
}
export interface RecordContextProps {readonly icon?:SemanticIconKind; readonly label?:string; readonly children?:ReactNode;}
export function RecordContext({icon,label,children}:RecordContextProps):ReactNode {
  if(children == null || children === "") return null;
  return <span data-record-context="">{icon && <SemanticIcon kind={icon} label={label}/>}{children}</span>;
}
export interface RecordFact {readonly id:string; readonly label:ReactNode; readonly value:ReactNode; readonly actions?:ReactNode;}
/** Paired labelled facts, distinct from comparing several records in a table. */
export function RecordFacts({items,label,presentation="grid"}: {readonly items:readonly RecordFact[]; readonly label?:string; readonly presentation?:"grid"|"list"}):ReactNode {
  if (!items.length) return null;
  return <dl aria-label={label} data-ui-component="record-facts" data-presentation={presentation}>{items.map(item=><div key={item.id}><dt className={contentPresentation.caption}>{item.label}</dt><dd>{item.actions == null ? item.value : <><span data-record-fact="value">{item.value}</span><span data-record-fact="actions">{item.actions}</span></>}</dd></div>)}</dl>;
}
/** Actual messages form the thread. A draft editor is separate from sent outgoing messages. */
export function MessageThread({label,messages,children,presentation="conversation"}: {readonly label:string; readonly messages:readonly ThreadMessage[]; readonly children?:ReactNode; readonly presentation?:"conversation"|"correspondence"}): ReactNode {
  return <section aria-label={label} data-ui-component="message-thread" data-presentation={presentation}><ol>{messages.map(message=><li key={message.id} data-message-direction={message.direction}>
    <div data-message-region="context" className={contentPresentation.caption}><span>{message.sender}</span>{message.dateTime && message.timeLabel && <time dateTime={message.dateTime}>{message.timeLabel}</time>}</div>
    {presentation === "conversation" ? <ChatBubble direction={message.direction} label="메시지"><div className={contentPresentation.body}>{message.body}</div></ChatBubble> : <div className={contentPresentation.body}>{message.body}</div>}
  </li>)}</ol>{children && <div data-message-region="composer">{children}</div>}</section>;
}
export interface ComparedField {readonly id:string; readonly label:string; readonly before:ReactNode; readonly after:ReactNode;}
/** Before/after is an actual comparison, never decorative red/green coloring of prose. */
export function ChangeComparison({label,fields}: {readonly label:string; readonly fields:readonly ComparedField[]}): ReactNode {
  return <div data-ui-component="change-comparison"><table aria-label={label}><colgroup><col data-comparison-column="label"/><col span={2}/></colgroup><thead><tr><th scope="col">항목</th><th scope="col">변경 전</th><th scope="col">변경 후</th></tr></thead><tbody>{fields.map(field=><tr key={field.id}><th scope="row">{field.label}</th><td>{field.before}</td><td>{field.after}</td></tr>)}</tbody></table></div>;
}
