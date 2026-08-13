import type { DOMObservation, TextDOMAdapter, TextSelection } from "../types.js";

export const plainTextDOMAdapter: TextDOMAdapter = Object.freeze({
  observe(root: HTMLElement): DOMObservation {
    return {
      value: plainTextFromChildren(root),
      selection: selectionInRoot(root),
    };
  },
  render(root: HTMLElement, value: string): void {
    root.replaceChildren(root.ownerDocument.createTextNode(value));
  },
  restoreSelection(
    root: HTMLElement,
    selection: TextSelection,
  ): boolean {
    if (!root.isConnected) return false;
    const value = root.textContent ?? "";
    const clamped = clampSelectionToScalarBoundaries(value, selection);
    const anchor = domPositionForOffset(root, clamped.anchor);
    const focus = domPositionForOffset(root, clamped.focus);
    const domSelection = root.ownerDocument.getSelection();
    if (
      anchor === null
      || focus === null
      || domSelection === null
    ) {
      return false;
    }
    try {
      domSelection.removeAllRanges();
      domSelection.collapse(anchor.node, anchor.offset);
      domSelection.extend(focus.node, focus.offset);
      return true;
    } catch {
      return false;
    }
  },
});

function selectionInRoot(
  root: HTMLElement,
): TextSelection | null {
  const selection = root.ownerDocument.getSelection();
  if (
    selection === null
    || selection.anchorNode === null
    || selection.focusNode === null
    || !containsNode(root, selection.anchorNode)
    || !containsNode(root, selection.focusNode)
  ) {
    return null;
  }
  return {
    anchor: textOffsetForPosition(
      root,
      selection.anchorNode,
      selection.anchorOffset,
    ),
    focus: textOffsetForPosition(
      root,
      selection.focusNode,
      selection.focusOffset,
    ),
  };
}

function containsNode(root: HTMLElement, node: Node): boolean {
  return node === root || root.contains(node);
}

function textOffsetForPosition(
  root: HTMLElement,
  target: Node,
  targetOffset: number,
): number {
  const observation = projectPlainText(root, target, targetOffset);
  return observation.offset ?? observation.value.length;
}

function plainTextFromChildren(node: Node): string {
  return projectPlainText(node).value;
}

function projectPlainText(
  node: Node,
  target?: Node,
  targetOffset = 0,
): { readonly value: string; readonly offset: number | null } {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent ?? "";
    return {
      value,
      offset: node === target
        ? boundedInteger(targetOffset, 0, value.length)
        : null,
    };
  }
  if (isBreak(node)) {
    return { value: "\n", offset: node === target ? 0 : null };
  }

  let value = "";
  let offset: number | null = node === target && targetOffset === 0 ? 0 : null;
  let previous: Node | null = null;
  const children = Array.from(node.childNodes);
  const boundedTargetOffset = boundedInteger(targetOffset, 0, children.length);
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]!;
    const projected = projectPlainText(child, target, targetOffset);
    value += blockSeparator(previous, child, value, projected.value);
    if (node === target && boundedTargetOffset === index) offset = value.length;
    if (offset === null && projected.offset !== null) {
      offset = value.length + projected.offset;
    }
    value += projected.value;
    previous = child;
  }
  if (node === target && boundedTargetOffset === children.length) {
    offset = value.length;
  }
  return { value, offset };
}

function blockSeparator(
  previous: Node | null,
  current: Node,
  value: string,
  currentText: string,
): string {
  if (
    previous === null
    || (!isBlock(previous) && !isBlock(current))
    || value.endsWith("\n")
    || currentText.startsWith("\n")
  ) {
    return "";
  }
  return "\n";
}

function isBreak(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE
    && (node as Element).tagName.toLowerCase() === "br";
}

function isBlock(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE
    && BLOCK_ELEMENTS.has((node as Element).tagName.toLowerCase());
}

const BLOCK_ELEMENTS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "div",
  "dl",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "ul",
]);

function domPositionForOffset(
  root: HTMLElement,
  offset: number,
): { readonly node: Node; readonly offset: number } | null {
  let remaining = offset;
  const visit = (
    node: Node,
  ): { readonly node: Node; readonly offset: number } | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) return { node, offset: remaining };
      remaining -= length;
      return null;
    }
    for (const child of Array.from(node.childNodes)) {
      const found = visit(child);
      if (found !== null) return found;
    }
    return null;
  };
  return visit(root) ?? {
    node: root,
    offset: root.childNodes.length,
  };
}

function clampSelectionToScalarBoundaries(
  value: string,
  selection: TextSelection,
): TextSelection {
  const direction = selection.anchor === selection.focus
    ? "collapsed"
    : selection.anchor < selection.focus
      ? "forward"
      : "backward";
  const anchorAffinity = direction === "forward" ? "backward" : "forward";
  const focusAffinity = direction === "backward" ? "backward" : "forward";
  const anchor = clampScalarOffset(
    value,
    selection.anchor,
    anchorAffinity,
  );
  const focus = direction === "collapsed"
    ? anchor
    : clampScalarOffset(value, selection.focus, focusAffinity);
  return { anchor, focus };
}

function clampScalarOffset(
  value: string,
  offset: number,
  affinity: "backward" | "forward",
): number {
  const bounded = boundedInteger(offset, 0, value.length);
  if (
    bounded > 0
    && bounded < value.length
    && isHighSurrogate(value.charCodeAt(bounded - 1))
    && isLowSurrogate(value.charCodeAt(bounded))
  ) {
    return affinity === "backward" ? bounded - 1 : bounded + 1;
  }
  return bounded;
}

function boundedInteger(
  input: number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(input)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.trunc(input)));
}

function isHighSurrogate(value: number): boolean {
  return value >= 0xd800 && value <= 0xdbff;
}

function isLowSurrogate(value: number): boolean {
  return value >= 0xdc00 && value <= 0xdfff;
}
