/** A measured review region in the rendered HTML viewport, never guessed from a pointer. */
export interface WebHTMLReviewRegion {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly kind: "target" | "added" | "changed" | "removed" | "page";
}
export interface WebHTMLReviewRequest {
  readonly id: string;
  readonly nodeIds: readonly string[];
  readonly before?: string;
  readonly after?: string;
}

/** Resolve targets and authored changes against the live, script-disabled iframe.
 * Stylesheet changes and deleted nodes use an explicit page-level fallback: old
 * coordinates must not be presented as the location of a current element.
 */
export function measureWebHTMLReview(documentValue: unknown, requests: readonly WebHTMLReviewRequest[]): Record<string, WebHTMLReviewRegion[]> {
  const doc = documentValue as Document;
  const nodes = (root: ParentNode) => new Map(Array.from(root.querySelectorAll<HTMLElement>("[data-node-id]")).map(node => [node.dataset.nodeId!, node]));
  const live = nodes(doc);
  const parse = (html: string) => { const template = doc.createElement("template"); template.innerHTML = html; return template.content; };
  const signature = (node: Element) => JSON.stringify([node.localName, Array.from(node.attributes).map(a => [a.name, a.value]).sort(), Array.from(node.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent), Array.from(node.children).map(n => n.getAttribute("data-node-id") ?? n.outerHTML)]);
  const page = (kind: WebHTMLReviewRegion["kind"]): WebHTMLReviewRegion => ({ nodeId: "", x: 0, y: 0, width: doc.documentElement.clientWidth, height: doc.documentElement.clientHeight, kind });
  return Object.fromEntries(requests.map(request => {
    let changes: { id: string; kind: WebHTMLReviewRegion["kind"] }[] = request.nodeIds.map(id => ({ id, kind: "target" }));
    let fallback: WebHTMLReviewRegion["kind"] | null = null;
    if (request.before !== undefined && request.after !== undefined) {
      const before = parse(request.before), after = parse(request.after);
      const old = nodes(before), next = nodes(after);
      changes = [];
      for (const [id, node] of next) {
        if (!old.has(id)) changes.push({ id, kind: "added" });
        else if (signature(old.get(id)!) !== signature(node)) changes.push({ id, kind: "changed" });
      }
      if ([...old.keys()].some(id => !next.has(id))) fallback = "removed";
      const styles = (root: ParentNode) => Array.from(root.querySelectorAll("style")).map(n => n.textContent).join("\n");
      if (styles(before) !== styles(after)) fallback = "page";
      if (!changes.length && !fallback && request.before !== request.after) fallback = "page";
      // An older result may have been changed again. Never label unrelated live content as that result.
      changes = changes.filter(change => {
        const current = live.get(change.id), expected = next.get(change.id);
        if (!current || !expected || signature(current) !== signature(expected)) { fallback = "page"; return false; }
        return true;
      });
    }
    const regions = changes.flatMap(change => {
      const node = live.get(change.id);
      if (!node) return [];
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 ? [{ nodeId: change.id, x: rect.x, y: rect.y, width: rect.width, height: rect.height, kind: change.kind }] : [];
    });
    if (fallback) regions.push(page(fallback));
    return [request.id, regions];
  }));
}
