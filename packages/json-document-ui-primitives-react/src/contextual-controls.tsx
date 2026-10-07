import { contextualAffordance, type ContextualAffordanceCapability, type ContextualAffordanceSnapshot } from "@interactive-os/json-document-affordance";
import { useEffect, useState, type Ref, type HTMLAttributes, type ReactNode } from "react";

export function ContextualControls<Id extends string>(props: Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  readonly capabilities: ReadonlyArray<ContextualAffordanceCapability<Id>>;
  readonly rootRef?: Ref<HTMLDivElement>;
  /** Keep controls discoverable when the primary input cannot hover. */
  readonly revealWithoutHover?: boolean;
  readonly selected?: boolean;
  readonly editing?: boolean;
  readonly children: (snapshot: ContextualAffordanceSnapshot<Id>) => ReactNode;
}): ReactNode {
  const { capabilities, rootRef, revealWithoutHover = false, selected, editing, onPointerEnter, onPointerLeave, onFocus, onBlur, children, ...rootProps } = props;
  const [approached, setApproached] = useState(false);
  const [focused, setFocused] = useState(false);
  const [withoutHover, setWithoutHover] = useState(false);
  useEffect(() => {
    if (!revealWithoutHover || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(hover: none)");
    const update = () => setWithoutHover(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [revealWithoutHover]);
  const snapshot = contextualAffordance({
    approached: approached || (revealWithoutHover && withoutHover),
    focused,
    selected: selected ?? false,
    editing: editing ?? false,
    capabilities,
  });

  return (
    <div
      {...rootProps}
      ref={rootRef}
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
