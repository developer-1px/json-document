import { contextualAffordance, type ContextualAffordanceCapability, type ContextualAffordanceSnapshot } from "@interactive-os/json-document-affordance";
import { useState, type HTMLAttributes, type ReactNode } from "react";

export function ContextualControls<Id extends string>(props: Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  readonly capabilities: ReadonlyArray<ContextualAffordanceCapability<Id>>;
  readonly selected?: boolean;
  readonly editing?: boolean;
  readonly children: (snapshot: ContextualAffordanceSnapshot<Id>) => ReactNode;
}): ReactNode {
  const { capabilities, selected, editing, onPointerEnter, onPointerLeave, onFocus, onBlur, children, ...rootProps } = props;
  const [approached, setApproached] = useState(false);
  const [focused, setFocused] = useState(false);
  const snapshot = contextualAffordance({
    approached,
    focused,
    selected: selected ?? false,
    editing: editing ?? false,
    capabilities,
  });

  return (
    <div
      {...rootProps}
      data-ui-component="contextual-controls"
      data-contextual-phase={snapshot.phase}
      onPointerEnter={(event) => {
        setApproached(true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setApproached(false);
        onPointerLeave?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        onBlur?.(event);
      }}
    >
      {children(snapshot)}
    </div>
  );
}
