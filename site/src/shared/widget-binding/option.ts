import type { EditingItem } from "@interactive-os/json-document-react";

export function optionProps(item: EditingItem) {
  const selected = item.getIsSelected();
  return {
    selected,
    focus: item.getIsFocus(),
    "aria-selected": selected,
    onClick: item.getPressHandler(),
  } as const;
}

export function gridCellProps(item: EditingItem) {
  return {
    ...optionProps(item),
    role: "gridcell" as const,
    tabIndex: item.getIsFocus() ? 0 : -1,
  } as const;
}

export function treeItemProps(item: EditingItem) {
  return {
    ...optionProps(item),
    role: "treeitem" as const,
  } as const;
}
