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
