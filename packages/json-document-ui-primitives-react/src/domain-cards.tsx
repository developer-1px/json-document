import type {ReactNode} from "react";
import {ContentCard} from "./content-card.js";
import {QuantityDisplay, MoneyDisplay} from "./numeric-presentation.js";
import {Check} from "./input-controls.js";
import {ActivityFeed} from "./workflow-history.js";
import {RecordSummary, MessageThread, ChangeComparison, SemanticIcon, StateIndicator, type SemanticIconKind, type ComparedField, RecordDetail, RecordContext, RecordFacts} from "./record-affordances.js";
import {StatusBadge} from "./record-presentation.js";
import {contentPresentation} from "./content-presentation.js";
import {Avatar} from "./record-identity.js";
import {ContentGroup} from "./content-group.js";

/** Shared tokens do not force different tasks into the same surface or anatomy. */
export interface DomainCardProps {
  readonly title: ReactNode;
  readonly identifier?: ReactNode;
  readonly status?: ReactNode;
  readonly children?: ReactNode;
  readonly actions?: ReactNode;
}
function Body({children}: {readonly children?:ReactNode}): ReactNode {
  return children == null || children === "" ? null : <div className={contentPresentation.body}>{children}</div>;
}
function Heading({kind,title,identifier,status,indicators}: DomainCardProps & {readonly kind:SemanticIconKind; readonly indicators?:ReactNode}): ReactNode {
  return <RecordSummary headingLevel={2} leading={<SemanticIcon kind={kind}/>} title={title} status={status} indicators={indicators} metadata={identifier}/>;
}
export interface InquiryCardProps extends DomainCardProps {readonly body?:ReactNode; readonly customer?:ReactNode; readonly priority?:ReactNode; readonly unread?:boolean; readonly presentation?:"conversation"|"correspondence";}
/** A received message plus a separate reply editor; drafts are never presented as sent messages. */
export function InquiryCard({title,identifier,status,body,customer,priority,unread,presentation="correspondence",children,actions}: InquiryCardProps): ReactNode {
  return <RecordDetail header={<Heading kind="message" title={title} identifier={identifier} status={status} indicators={unread ? <StateIndicator state="unread" label="읽지 않은 문의"/> : undefined}/>} actions={actions}>
    {priority != null && <div className={contentPresentation.caption}>{priority}</div>}
    <MessageThread presentation={presentation} label="문의 대화" messages={body == null ? [] : [{id:"received",sender:customer ?? "문의",body,direction:"incoming"}]}>{children}</MessageThread>
  </RecordDetail>;
}
export interface TaskCardProps extends DomainCardProps {readonly summary?:ReactNode; readonly assignee?:ReactNode; readonly due?:ReactNode; readonly priority?:ReactNode; readonly completed?:boolean; readonly overdue?:boolean; readonly flagged?:boolean; readonly onCompletedChange?:(value:boolean)=>void;}
/** Compact task anatomy; completion is interactive only when a real callback exists. */
export function TaskCard({title,identifier,status,summary,assignee,due,priority,completed,overdue,flagged,onCompletedChange,children,actions}: TaskCardProps): ReactNode {
  return <RecordDetail actions={actions}>
    <RecordSummary headingLevel={2} title={title} leading={onCompletedChange ? <Check label="업무 완료" checked={completed === true} onCheckedChange={onCompletedChange}/> : <SemanticIcon kind="task"/>} status={status} summary={summary} indicators={<>{flagged && <SemanticIcon kind="flag" label="중요 표시됨"/>}{completed && !onCompletedChange && <StateIndicator state="complete" label="완료한 업무"/>}{overdue && !completed && <StateIndicator state="overdue" label="기한 초과"/>}</>} metadata={<>{identifier && <span>{identifier}</span>}<RecordContext icon="person" label="담당자">{assignee}</RecordContext><RecordContext icon="deadline" label="마감">{due}</RecordContext>{priority}</>}/>
    {children}
  </RecordDetail>;
}
export interface ProductCardProps extends DomainCardProps {readonly category?:ReactNode; readonly quantity?:{readonly value:number|null; readonly unit:string}; readonly price?:{readonly value:number|null; readonly currency:string}; readonly note?:ReactNode;}
/** One product's facts are paired values; multi-product comparison still belongs to the table. */
export function ProductCard({title,identifier,status,category,quantity,price,note,children,actions}: ProductCardProps): ReactNode {
  return <ContentCard header={<Heading kind="product" title={title} identifier={identifier} status={status ?? (quantity?.value === 0 ? <StatusBadge>재고 없음</StatusBadge> : undefined)}/>} actions={actions}>
    {category != null && <span className={contentPresentation.caption}>{category}</span>}
    <RecordFacts items={[
      ...(quantity ? [{id:"quantity",label:"재고",value:<QuantityDisplay value={quantity.value} unit={quantity.unit}/>}] : []),
      ...(price ? [{id:"price",label:"단가",value:<MoneyDisplay value={price.value} currency={price.currency}/>}]:[]),
    ]}/>
    <Body>{note}</Body>{children}
  </ContentCard>;
}
export interface ApprovalCardProps extends DomainCardProps {readonly change?:ReactNode; readonly comparison?:readonly ComparedField[]; readonly requester?:ReactNode; readonly requestedAt?:ReactNode; readonly changed?:boolean;}
/** Actual before/after facts precede permitted decision controls. */
export function ApprovalCard({title,identifier,status,change,comparison,requester,requestedAt,changed,children,actions}: ApprovalCardProps): ReactNode {
  return <RecordDetail actions={actions}>
    <Heading kind="change" title={title} identifier={identifier} status={status} indicators={changed ? <StateIndicator state="changed" label="요청 내용이 변경됨"/> : undefined}/>
    <Body>{change}</Body>{comparison?.length ? <ChangeComparison label="요청 변경 비교" fields={comparison}/> : null}
    <div data-record-contexts="" className={contentPresentation.caption}><RecordContext icon="person" label="요청자">{requester}</RecordContext><RecordContext icon="deadline" label="요청 시각">{requestedAt}</RecordContext></div>
    {children}
  </RecordDetail>;
}
export interface ActivityCardProps extends DomainCardProps {readonly actor:ReactNode; readonly dateTime:string; readonly timeLabel:string; readonly subject?:ReactNode; readonly detail?:ReactNode;}
/** An event occupies a timeline, not another generic properties card. */
export function ActivityCard({title,actor,dateTime,timeLabel,subject,detail,identifier,children,actions}: ActivityCardProps): ReactNode {
  return <RecordDetail actions={actions}>
    <ActivityFeed label="활동 이력" presentation="timeline" entries={[{id:"event",actor,action:<strong className={contentPresentation.itemTitle}>{title}</strong>,dateTime,timeLabel,icon:<SemanticIcon kind="activity"/>,detail:<>{detail && <Body>{detail}</Body>}{subject && <div className={contentPresentation.caption}><RecordContext icon="link" label="관련 대상">{subject}</RecordContext></div>}{identifier}</>}]}/>
    {children}
  </RecordDetail>;
}
export interface EvidenceCardProps extends DomainCardProps {readonly body?:ReactNode; readonly source?:ReactNode; readonly empty?:ReactNode;}
/** A readable result document with a distinct source boundary, not a metadata grid. */
export function EvidenceCard({title,identifier,status,body,source,empty,children,actions}: EvidenceCardProps): ReactNode {
  return <RecordDetail header={<Heading kind="result" title={title} identifier={identifier} status={status}/>} supplementary={source != null && source !== "" ? <RecordContext icon="source" label="근거">{source}</RecordContext> : undefined} actions={actions}>
    <Body>{body ?? empty}</Body>{children}
  </RecordDetail>;
}

export interface PersonCardProps extends DomainCardProps {readonly name:string; readonly src?:string; readonly role?:ReactNode; readonly organization?:ReactNode; readonly contact?:ReactNode;}
/** Identity precedes affiliation; a contact channel is separate from the person's description. */
export function PersonCard({title,name,src,role,organization,contact,status,identifier,children,actions}:PersonCardProps):ReactNode {
  return <RecordDetail header={<RecordSummary headingLevel={2} leading={<Avatar name={name} src={src}/>} title={title} status={status} summary={role} metadata={organization}/>}
    supplementary={contact ? <RecordFacts items={[{id:"contact",label:"연락처",value:contact}]}/> : undefined} actions={actions}>
    {identifier && <span className={contentPresentation.caption}>{identifier}</span>}{children}
  </RecordDetail>;
}

export interface EventCardProps extends DomainCardProps {readonly schedule:ReactNode; readonly location?:ReactNode; readonly participants?:ReactNode; readonly agenda?:ReactNode;}
/** An occurrence has a time first, then place and people; its surface owns one calendar unit. */
export function EventCard({title,identifier,status,schedule,location,participants,agenda,children,actions}:EventCardProps):ReactNode {
  return <ContentCard boundary="surface" header={<ContentGroup relationship="related"><RecordContext icon="event" label="일정">{schedule}</RecordContext><RecordSummary headingLevel={2} title={title} status={status} metadata={identifier}/></ContentGroup>} actions={actions}>
    <RecordFacts items={[...(location ? [{id:"location",label:<RecordContext icon="location">장소</RecordContext>,value:location}] : []),...(participants ? [{id:"participants",label:<RecordContext icon="participants">참석자</RecordContext>,value:participants}] : [])]}/>
    <Body>{agenda}</Body>{children}
  </ContentCard>;
}

export interface FileCardProps extends DomainCardProps {readonly format?:ReactNode; readonly size?:ReactNode; readonly updated?:ReactNode; readonly preview?:ReactNode; readonly owner?:ReactNode;}
/** A portable document is an outlined unit; preview and provenance are separate reading groups. */
export function FileCard({title,identifier,status,format,size,updated,preview,owner,children,actions}:FileCardProps):ReactNode {
  return <ContentCard header={<Heading kind="file" title={title} identifier={identifier} status={status}/>} actions={actions}>
    {preview != null && <Body>{preview}</Body>}
    <RecordDetail supplementary={owner || updated ? <RecordFacts items={[...(owner ? [{id:"owner",label:"작성자",value:owner}] : []),...(updated ? [{id:"updated",label:"수정일",value:updated}] : [])]}/> : undefined}>
      <div data-record-contexts="" className={contentPresentation.caption}>{format != null && <span>{format}</span>}{size != null && <span>{size}</span>}</div>
    </RecordDetail>{children}
  </ContentCard>;
}
