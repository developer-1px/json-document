import { useEffect, useRef } from "react";
import { createContentEditableBinding } from "./lease.js";
import type { ContentEditableProps } from "./types.js";

export function ContentEditable({
  "aria-label": ariaLabel,
  className,
  document,
  pointer,
}: ContentEditableProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    const adapter = createContentEditableBinding({
      document,
      pointer,
      root,
    });
    return adapter.bind();
  }, [document, pointer]);

  return (
    <div
      ref={rootRef}
      aria-label={ariaLabel}
      className={className}
      contentEditable
      role="textbox"
      suppressContentEditableWarning
    />
  );
}
