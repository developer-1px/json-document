import type { TextDOMAdapter, TextSelection } from "../types.js";

/** A source interval displayed as one unit; editing still uses the original string. */
export interface TextProjection {
  readonly from: number;
  readonly to: number;
  readonly element: HTMLElement;
  /** Optional next visible source position, after a concealed separator. */
  readonly following?: number;
  /** Delete this displayed unit and its separator in one editing transaction. */
  readonly atomic?: boolean;
}

/** Owns projected navigation and visual caret edges, without syntax or editing policy. */
export function createTextProjectionDOMAdapter(
  base: TextDOMAdapter,
  projections: (root: HTMLElement) => ReadonlyArray<TextProjection>,
): TextDOMAdapter {
  const paint = (root: HTMLElement, selection: TextSelection | null): void => {
    let active = false;
    for (const region of projections(root)) {
      const focus = selection?.anchor === selection?.focus ? selection?.focus : undefined;
      const edge = !active && focus !== undefined && focus >= region.from && focus <= region.to
        ? (focus - region.from < region.to - focus ? "before" : "after") : null;
      if (edge) {
        active = true;
        if (region.element.getAttribute("data-text-projection-edge") !== edge) region.element.setAttribute("data-text-projection-edge", edge);
      } else region.element.removeAttribute("data-text-projection-edge");
    }
    if (root.hasAttribute("data-text-projection-caret") !== active) root.toggleAttribute("data-text-projection-caret", active);
  };
  return {
    observe: root => base.observe(root),
    render(root, value, selection = null) {
      base.render(root, value, selection);
      paint(root, selection);
    },
    restoreSelection(root, selection, options) {
      const regions = projections(root);
      const restored = base.restoreSelection(root, selection, {
        affinity: offset => regions.some(region => region.following === offset) ? "forward" : options?.affinity?.(offset) ?? "backward",
      });
      paint(root, restored ? base.observe(root).selection : null);
      return restored;
    },
    resolveDeletionSelection(root, selection, direction) {
      const from = Math.min(selection.anchor, selection.focus), to = Math.max(selection.anchor, selection.focus);
      const regions = projections(root);
      const atoms = regions.filter(region => region.atomic && (from === to
        ? direction === "backward" ? from > region.from && from <= (region.following ?? region.to) : from >= region.from && from < region.to
        : to > region.from && from < region.to));
      if (atoms.length) {
        const start = Math.min(from, ...atoms.map(region => region.from));
        const end = Math.max(to, ...atoms.map(region => region.following ?? region.to));
        return {anchor:start, focus:end};
      }
      if (!regions.some(region => to >= region.from && from <= (region.following ?? region.to))) {
        return base.resolveDeletionSelection?.(root, selection, direction) ?? null;
      }
      if (from !== to) return selection;
      const source = base.observe(root).value;
      const segments = new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(source);
      const segment = segments.containing(direction === "backward" ? from - 1 : from);
      if (!segment) return selection;
      return direction === "backward"
        ? {anchor: segment.index, focus: from}
        : {anchor: from, focus: segment.index + segment.segment.length};
    },
    resolveHorizontalSelection(root, selection, direction, extend) {
      const collapsed = selection.anchor === selection.focus;
      const focus = !extend && !collapsed
        ? (direction === "backward" ? Math.min(selection.anchor, selection.focus) : Math.max(selection.anchor, selection.focus))
        : selection.focus;
      for (const region of projections(root)) {
        const end = region.following ?? region.to;
        if (focus < region.from || focus > end) continue;
        if (!extend && !collapsed) return {anchor: focus, focus};
        const stops = [region.from, region.to, end];
        const next = direction === "backward"
          ? stops.filter(offset => offset < focus).at(-1)
          : stops.find(offset => offset > focus);
        if (next !== undefined) return {anchor: extend ? selection.anchor : next, focus: next};
      }
      return base.resolveHorizontalSelection?.(root, selection, direction, extend) ?? null;
    },
  };
}
