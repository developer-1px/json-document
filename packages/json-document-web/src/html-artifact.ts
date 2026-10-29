import type { CanvasHTMLAdapter } from "@interactive-os/json-document-editing";

const elements = new Set("div span main section article header footer aside nav h1 h2 h3 h4 h5 h6 p b strong i em u s small sub sup br hr ul ol li dl dt dd figure figcaption blockquote pre code table caption colgroup col thead tbody tfoot tr th td style title meta img a".split(" "));
const attributes = new Set("id class style title lang dir role data-node-id width height alt src colspan rowspan scope start type charset name content".split(" "));

function fragment(html: string) {
  if (!html.trim() || html.length > 250_000) throw new Error("html.invalid-size: provide 1–250000 characters");
  const template = document.createElement("template");
  template.innerHTML = html; // Inert template document: no fetch or execution.
  const ids = new Set<string>();
  const nodes: { id: string; tag: string; text: string }[] = [];
  for (const node of Array.from(template.content.querySelectorAll("*"))) {
    const tag = node.localName;
    if (node.namespaceURI !== "http://www.w3.org/1999/xhtml" || !elements.has(tag)) throw new Error(`html.unsupported-element:${tag}`);
    for (const attr of Array.from(node.attributes)) {
      if (!attributes.has(attr.name) && !attr.name.startsWith("aria-")) throw new Error(`html.unsupported-attribute:${attr.name}`);
      if (attr.name === "src" && (tag !== "img" || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(attr.value))) throw new Error("html.external-resource: use embedded PNG/JPEG/WebP");
    }
    if (tag === "meta" && !node.hasAttribute("charset") && node.getAttribute("name") !== "viewport") throw new Error("html.unsupported-meta");
    const id = node.getAttribute("data-node-id");
    if (id !== null) {
      if (!id.trim() || ids.has(id)) throw new Error(`html.duplicate-or-empty-id:${id}`);
      ids.add(id); nodes.push({ id, tag, text: node.children.length ? "" : node.textContent ?? "" });
    }
  }
  if (!nodes.length) throw new Error("html.node-id-required: mark editable elements with data-node-id");
  if (template.content.querySelectorAll("*").length > 2000) throw new Error("html.too-many-elements");
  return { template, nodes };
}

/** Strict supported HTML/CSS intake. Preserves original source; rejects active markup. */
export const webCanvasHTMLAdapter: CanvasHTMLAdapter = {
  parse(html) { const { nodes } = fragment(html); return { html, nodes }; },
};

export interface WebHTMLNodeChange {
  readonly text?: string;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly fontSize?: number;
}

/** Edit the authored node, never serialize the live selection/contenteditable DOM. */
export function editWebHTMLArtifactNode(html: string, nodeId: string, change: WebHTMLNodeChange): string {
  const { template } = fragment(html);
  const node = Array.from(template.content.querySelectorAll<HTMLElement>("[data-node-id]")).find(node => node.dataset.nodeId === nodeId);
  if (!node) throw new Error("html.node-not-found");
  if (change.text !== undefined) {
    if (node.children.length || ["style", "meta", "title", "img"].includes(node.localName)) throw new Error("html.text-requires-leaf");
    node.textContent = change.text;
  }
  for (const [property, value] of [["color", change.color], ["background-color", change.backgroundColor]] as const) {
    if (value === undefined) continue;
    const probe = document.createElement("span"); probe.style.setProperty(property, value);
    if (!probe.style.getPropertyValue(property)) throw new Error("html.invalid-color");
    // A chosen solid fill replaces an authored gradient rather than hiding below it.
    node.style.setProperty(property === "background-color" ? "background" : property, value, "important");
  }
  if (change.fontSize !== undefined) {
    if (!Number.isFinite(change.fontSize) || change.fontSize <= 0) throw new Error("html.invalid-font-size");
    node.style.setProperty("font-size", `${change.fontSize}px`, "important");
  }
  const result = template.innerHTML;
  fragment(result);
  return result;
}

/** Render in a sandboxed iframe WITHOUT allow-scripts. CSS/network stay isolated.
 * allow-same-origin is permitted for trusted parent-owned editing event bindings. */
export function createWebHTMLArtifactSource(html: string): string {
  const { template } = fragment(html);
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; base-uri 'none'; form-action 'none'"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}</style></head><body>${template.innerHTML}</body></html>`;
}
