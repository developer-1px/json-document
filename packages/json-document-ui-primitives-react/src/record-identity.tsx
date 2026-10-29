import {useState, type ReactNode} from "react";
import {SemanticIcon} from "./record-affordances.js";
import {contentPresentation} from "./content-presentation.js";
export function Avatar({name, src, fallback}: {readonly name: string; readonly src?: string | undefined; readonly fallback?: ReactNode}): ReactNode {
  const [failedSource, setFailedSource] = useState<string>();
  const initials = name.trim().split(/\s+/).map(part => Array.from(part)[0]).slice(0, 2).join("");
  return <span data-ui-component="avatar" aria-label={name} role="img">{src && failedSource !== src ? <img src={src} alt="" onError={() => setFailedSource(src)} /> : <span aria-hidden="true">{fallback ?? (initials || "?")}</span>}</span>;
}
export function PersonIdentity({name, src}: {readonly name: string; readonly src?: string | undefined}): ReactNode {
  return <span data-ui-component="person-identity"><span aria-hidden="true"><Avatar name={name} src={src} /></span><span>{name}</span></span>;
}
export function PriorityIndicator({label, level}: {readonly label: string; readonly level: "low" | "normal" | "high"}): ReactNode {
  return <span data-ui-component="priority-indicator" data-priority={level}><SemanticIcon kind="priority"/>{label}</span>;
}
/** Explicit domain label and overdue state; locale formatting belongs to the host/date owner. */
export function DateDisplay({value, children, overdue = false}: {readonly value: string; readonly children: ReactNode; readonly overdue?: boolean}): ReactNode {
  return <span data-ui-component="date-display" data-overdue={overdue || undefined}><time dateTime={value}>{children}</time>{overdue && <span className={contentPresentation.caption}>기한 초과</span>}</span>;
}
/** One period with two explicit endpoints. Locale formatting remains with the date owner. */
export function DateRangeDisplay({start,end,startLabel=start,endLabel=end}: {readonly start:string; readonly end:string; readonly startLabel?:ReactNode; readonly endLabel?:ReactNode}): ReactNode {
  return <span data-ui-component="date-range-display">{start ? <DateDisplay value={start}>{startLabel}</DateDisplay> : "시작 미정"}<span> – </span>{end ? <DateDisplay value={end}>{endLabel}</DateDisplay> : "종료 미정"}</span>;
}
