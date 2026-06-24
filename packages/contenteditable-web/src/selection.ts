import type { Pointer, SelectionPoint, SelectionSnap } from "@interactive-os/json-document";
import {
  closestAttributeElement,
  findElementByAttribute,
  textDOMPositionForOffset,
  textOffsetInElement,
} from "./domText.js";

export function selectionFromDOM(
  root: HTMLElement,
  textAttribute: string,
  atomAttribute: string,
): SelectionSnap | null {
  const selection = root.ownerDocument.getSelection();
  if (
    selection === null ||
    selection.anchorNode === null ||
    selection.focusNode === null ||
    !root.contains(selection.anchorNode) ||
    !root.contains(selection.focusNode)
  ) {
    return null;
  }

  const anchor = textPointFromDOMPosition(
    root,
    textAttribute,
    atomAttribute,
    selection.anchorNode,
    selection.anchorOffset,
  );
  const focus = textPointFromDOMPosition(
    root,
    textAttribute,
    atomAttribute,
    selection.focusNode,
    selection.focusOffset,
  );
  if (anchor === null || focus === null) return null;
  return selectionFromPoints(anchor, focus);
}

export function textPointFromDOMSelection(
  root: HTMLElement,
  textAttribute: string,
  atomAttribute: string,
): { path: Pointer; offset: number } | null {
  const selection = root.ownerDocument.getSelection();
  if (selection === null || selection.focusNode === null || !root.contains(selection.focusNode)) {
    return null;
  }
  return textPointFromDOMPosition(
    root,
    textAttribute,
    atomAttribute,
    selection.focusNode,
    selection.focusOffset,
  );
}

export function restoreDOMSelection(
  root: HTMLElement,
  selection: SelectionSnap | undefined,
  textAttribute: string,
  atomAttribute: string,
): boolean {
  const range = selection?.selectionRanges[selection.primaryIndex];
  if (range === undefined) return false;

  const anchor = domPositionFromSelectionPoint(root, range.anchor, textAttribute, atomAttribute);
  const focus = domPositionFromSelectionPoint(root, range.focus, textAttribute, atomAttribute);
  if (anchor === null || focus === null) return false;

  const domSelection = root.ownerDocument.getSelection();
  if (domSelection === null) return false;

  domSelection.removeAllRanges();
  domSelection.collapse(anchor.node, anchor.offset);
  if (anchor.node !== focus.node || anchor.offset !== focus.offset) {
    domSelection.extend(focus.node, focus.offset);
  }
  return true;
}

export function textPathFromSelection(selection: SelectionSnap | null): Pointer | null {
  const range = selection?.selectionRanges[selection.primaryIndex];
  if (
    range === undefined ||
    typeof range.anchor === "string" ||
    typeof range.focus === "string" ||
    range.anchor.path !== range.focus.path
  ) {
    return null;
  }
  return range.anchor.path;
}

function textPointFromDOMPosition(
  root: HTMLElement,
  textAttribute: string,
  atomAttribute: string,
  node: Node,
  offset: number,
): { path: Pointer; offset: number } | null {
  const element = closestAttributeElement(root, node, textAttribute);
  const path = element?.getAttribute(textAttribute) ?? null;
  if (element === null || path === null) return null;
  return {
    path,
    offset: textOffsetInElement(element, node, offset, atomAttribute),
  };
}

function domPositionFromSelectionPoint(
  root: HTMLElement,
  point: SelectionPoint,
  textAttribute: string,
  atomAttribute: string,
): { node: Node; offset: number } | null {
  if (typeof point === "string") return null;
  const element = findElementByAttribute(root, textAttribute, point.path);
  return element === null
    ? null
    : textDOMPositionForOffset(element, point.offset ?? 0, atomAttribute);
}

function selectionFromPoints(anchor: SelectionPoint, focus: SelectionPoint): SelectionSnap {
  return {
    selectedPointers: [],
    selectionRanges: [{ anchor, focus }],
    primaryIndex: 0,
    anchor,
    focus,
  };
}
