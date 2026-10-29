import type { HTMLAttributes, ReactNode } from "react";

/** One message, aligned relative to the current reader. Content and sender copy belong to the Host. */
export interface ChatBubbleProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role" | "aria-label"> {
  readonly direction: "incoming" | "outgoing";
  readonly label: string;
  readonly children: ReactNode;
}

export function ChatBubble({ direction, label, children, ...props }: ChatBubbleProps): ReactNode {
  return (
    <div {...props} role="group" aria-label={label} data-ui-chat-bubble={direction}>
      {children}
    </div>
  );
}

/** Shared three-dot activity visual. Animation's WaveDots export delegates here. */
export function WaveDots({announce, label, frame = "none", children, ...props}: HTMLAttributes<HTMLSpanElement> & {readonly announce?: boolean; readonly label?: string; readonly frame?: "none" | "bubble"}): ReactNode {
  return <span {...props} data-ui-animation="wave-dots" data-ui-frame={frame === "bubble" ? "bubble" : undefined} role={announce ? "status" : props.role} aria-label={announce ? label : props["aria-label"]} aria-hidden={announce ? undefined : props["aria-hidden"] ?? true}>
    <span data-ui-animation="dot"/><span data-ui-animation="dot"/><span data-ui-animation="dot"/>{children}
  </span>;
}

/** Transient work status, never a conversational message. Import chat-bubble.css. */
export function ChatActivity({ label }: { readonly label: string }): ReactNode {
  return <div role="status" data-ui-chat-activity=""><WaveDots/><span>{label}</span></div>;
}
