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

/** Transient work status, never a conversational message. Import chat-bubble.css. */
export function ChatActivity({ label }: { readonly label: string }): ReactNode {
  return <div role="status" data-ui-chat-activity="">
    <span data-ui-chat-dots="" aria-hidden="true"><span /><span /><span /></span>
    <span>{label}</span>
  </div>;
}
