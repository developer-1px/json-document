export type WebWidgetState =
  | { readonly role: "button"; readonly pressed?: boolean; readonly disabled?: boolean }
  | { readonly role: "option" | "gridcell"; readonly selected: boolean; readonly disabled?: boolean }
  | {
    readonly role: "treeitem";
    readonly selected: boolean;
    readonly expanded?: boolean;
    readonly disabled?: boolean;
    readonly level?: number;
    readonly posInSet?: number;
    readonly setSize?: number;
  }
  | { readonly role: "disclosure"; readonly expanded: boolean; readonly disabled?: boolean };

export type WebWidgetARIA = Readonly<{
  role: "button" | "option" | "gridcell" | "treeitem";
  "aria-pressed"?: boolean;
  "aria-selected"?: boolean;
  "aria-expanded"?: boolean;
  "aria-disabled"?: true;
  "aria-level"?: number;
  "aria-posinset"?: number;
  "aria-setsize"?: number;
}>;

/** Projects canonical widget state to ARIA without owning that state. */
export function projectWebWidgetState(state: WebWidgetState): WebWidgetARIA {
  const disabled = state.disabled ? { "aria-disabled": true as const } : {};
  if (state.role === "button") {
    return state.pressed === undefined
      ? { role: "button", ...disabled }
      : { role: "button", "aria-pressed": state.pressed, ...disabled };
  }
  if (state.role === "disclosure") {
    return { role: "button", "aria-expanded": state.expanded, ...disabled };
  }
  if (state.role === "treeitem") {
    const hierarchy = {
      ...(state.level === undefined ? {} : { "aria-level": state.level }),
      ...(state.posInSet === undefined ? {} : { "aria-posinset": state.posInSet }),
      ...(state.setSize === undefined ? {} : { "aria-setsize": state.setSize }),
    };
    return state.expanded === undefined
      ? { role: state.role, "aria-selected": state.selected, ...hierarchy, ...disabled }
      : { role: state.role, "aria-selected": state.selected, "aria-expanded": state.expanded, ...hierarchy, ...disabled };
  }
  return { role: state.role, "aria-selected": state.selected, ...disabled };
}

export function activeDescendantContainerProps(activeId: string | null): Readonly<{
  tabIndex: 0;
  "aria-activedescendant"?: string;
}> {
  return activeId === null
    ? { tabIndex: 0 }
    : { tabIndex: 0, "aria-activedescendant": activeId };
}

export function activeDescendantItemProps(id: string): Readonly<{ id: string }> {
  return { id };
}

export function rovingFocusItemProps(focused: boolean): Readonly<{ tabIndex: 0 | -1 }> {
  return { tabIndex: focused ? 0 : -1 };
}
