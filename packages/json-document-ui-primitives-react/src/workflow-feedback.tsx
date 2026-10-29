import type {ReactNode} from "react";
import {ChatActivity} from "./chat-bubble.js";
import {Command} from "./controls.js";
import {contentPresentation} from "./content-presentation.js";
export function EmptyState({title, description, actions}: {readonly title: ReactNode; readonly description?: ReactNode; readonly actions?: ReactNode}): ReactNode {
  return <section data-ui-component="empty-state"><h2 className={contentPresentation.heading}>{title}</h2>{description && <p className={contentPresentation.caption}>{description}</p>}{actions && <div>{actions}</div>}</section>;
}
export function InlineAlert({title, children, tone = "info", actions}: {readonly title: ReactNode; readonly children?: ReactNode; readonly tone?: "info" | "error" | "success"; readonly actions?: ReactNode}): ReactNode {
  return <div data-ui-component="inline-alert" data-tone={tone} role={tone === "error" ? "alert" : "status"}><strong>{title}</strong>{children && <div>{children}</div>}{actions && <div>{actions}</div>}</div>;
}
export function ExecutionFeedback({state, label, description, onCancel, onRetry}: {readonly state: "idle" | "running" | "error" | "complete"; readonly label: string; readonly description?: ReactNode; readonly onCancel?: () => void; readonly onRetry?: () => void}): ReactNode {
  if (state === "idle") return null;
  if (state === "running") return <div data-ui-component="execution-feedback"><ChatActivity label={label} />{onCancel && <Command onClick={onCancel}>취소</Command>}</div>;
  return <InlineAlert title={label} tone={state === "error" ? "error" : "success"} actions={state === "error" && onRetry ? <Command onClick={onRetry}>다시 시도</Command> : undefined}>{description}</InlineAlert>;
}
export function Toast({message, onDismiss}: {readonly message: ReactNode; readonly onDismiss: () => void}): ReactNode {
  return <div role="status" data-ui-component="toast"><span>{message}</span><Command onClick={onDismiss}>닫기</Command></div>;
}
