import { projectMarkdown, type MarkdownProjection } from "@interactive-os/json-document-markdown";
import { plainTextDOMAdapter, type TextDOMAdapter, type TextSelection } from "@interactive-os/json-document-contenteditable";

interface Surface {
  readonly projection: MarkdownProjection;
  readonly delimiters: ReadonlyArray<{ readonly element: HTMLElement; readonly from: number; readonly to: number }>;
  markup: string;
}

/** Source-preserving DOM projection. Hidden delimiters remain text nodes in the source coordinate space. */
export function createMarkdownDOMAdapter(): TextDOMAdapter {
  const surfaces = new WeakMap<HTMLElement, Surface>();
  const reveal = (root: HTMLElement, selection: TextSelection | null): void => {
    const surface = surfaces.get(root);
    for (const { element, from, to } of surface?.delimiters ?? []) {
      const active = selection !== null && Math.max(selection.anchor, selection.focus) >= from && Math.min(selection.anchor, selection.focus) <= to;
      element.hidden = !active;
    }
    if (surface) surface.markup = root.innerHTML;
  };
  return {
    observe: (root) => plainTextDOMAdapter.observe(root),
    render(root, source, selection = null) {
      let surface = surfaces.get(root);
      if (surface?.projection.source !== source || root.innerHTML !== surface.markup) {
        const projection = projectMarkdown(source);
        const boundaries = [...new Set([0, source.length, ...projection.strong.flatMap((span) => [span.from, span.contentFrom, span.contentTo, span.to])])].sort((a, b) => a - b);
        const fragment = root.ownerDocument.createDocumentFragment();
        const delimiters: Array<{ element: HTMLElement; from: number; to: number }> = [];
        for (let i = 0; i < boundaries.length - 1; i++) {
          const from = boundaries[i]!;
          const to = boundaries[i + 1]!;
          const owner = projection.strong.find((span) => (from >= span.from && to <= span.contentFrom) || (from >= span.contentTo && to <= span.to));
          const strong = projection.strong.some((span) => from >= span.contentFrom && to <= span.contentTo);
          const element = root.ownerDocument.createElement(strong && !owner ? "strong" : "span");
          element.textContent = source.slice(from, to);
          element.dataset.markdownFrom = String(from);
          if (owner) {
            element.dataset.markdownDelimiter = "";
            delimiters.push({ element, from: owner.from, to: owner.to });
          }
          fragment.append(element);
        }
        if (source.length === 0) fragment.append(root.ownerDocument.createTextNode(""));
        root.replaceChildren(fragment);
        surface = { projection, delimiters, markup: root.innerHTML };
        surfaces.set(root, surface);
      }
      reveal(root, selection);
    },
    restoreSelection(root, selection) {
      reveal(root, selection);
      return plainTextDOMAdapter.restoreSelection(root, selection);
    },
  };
}
