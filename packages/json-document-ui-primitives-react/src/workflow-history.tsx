import type {ReactNode} from "react";
import {SemanticIcon} from "./record-affordances.js";
import {contentPresentation} from "./content-presentation.js";
export interface WorkflowStep {readonly id: string; readonly label: string; readonly state: "pending" | "current" | "complete";}
/** Read-only progress. A step is not a navigation button unless the host provides a separate action. */
export function Stepper({label, steps}: {readonly label: string; readonly steps: readonly WorkflowStep[]}): ReactNode {
  return <ol aria-label={label} data-ui-component="stepper">{steps.map((step, index) => <li key={step.id} aria-current={step.state === "current" ? "step" : undefined} data-step-state={step.state}><span aria-hidden="true">{index + 1}</span><span>{step.label}</span><span className={contentPresentation.caption}>{step.state === "complete" ? "완료" : step.state === "current" ? "진행 중" : "대기"}</span></li>)}</ol>;
}
export interface ActivityEntry {readonly id: string; readonly actor: ReactNode; readonly action: ReactNode; readonly dateTime: string; readonly timeLabel: string; readonly detail?: ReactNode; readonly icon?:ReactNode;}
export function ActivityFeed({label, entries, empty, presentation="list"}: {readonly label: string; readonly entries: readonly ActivityEntry[]; readonly empty?: ReactNode; readonly presentation?:"list"|"timeline"}): ReactNode {
  return <section aria-label={label} data-ui-component="activity-feed" data-activity-presentation={presentation}>{entries.length ? <ol>{entries.map(entry => <li key={entry.id} className={contentPresentation.group}>{presentation==="timeline" && <span data-activity-region="marker" aria-hidden="true">{entry.icon ?? <SemanticIcon kind="activity"/>}</span>}<div data-activity-region="content" className={contentPresentation.group}><div data-activity-region="heading"><span>{entry.actor} {entry.action}</span><time dateTime={entry.dateTime} className={contentPresentation.caption}>{entry.timeLabel}</time></div>{entry.detail && <div className={contentPresentation.body}>{entry.detail}</div>}</div></li>)}</ol> : empty}</section>;
}
