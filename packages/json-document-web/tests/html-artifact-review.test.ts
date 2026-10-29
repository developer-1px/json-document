// @vitest-environment jsdom
import { expect, it } from "vitest";
import { measureWebHTMLReview } from "../src/html-artifact-review.js";
const before = '<main data-node-id="page"><h1 data-node-id="title">Before</h1><p data-node-id="body">Keep</p></main>';
function render(html: string) {
  document.body.innerHTML = html;
  for (const node of document.querySelectorAll('[data-node-id]')) node.getBoundingClientRect = () => ({ x: 20, y: 40, width: 200, height: 80 }) as DOMRect;
}
it("uses actual targets and marks only the changed title, not its unchanged parent or sibling", () => {
  const after = before.replace('Before', 'After'); render(after);
  const results = measureWebHTMLReview(document, [{ id: 'running', nodeIds: ['body'] }, { id: 'done', nodeIds: ['body'], before, after }]);
  expect(results.running).toEqual([{ nodeId: 'body', kind: 'target', x: 20, y: 40, width: 200, height: 80 }]);
  expect(results.done?.map(r => r.nodeId)).toEqual(['title']);
});
it("shows additions and page-level deletion/style changes without inventing old coordinates", () => {
  const after = before.replace('<p data-node-id="body">Keep</p>', '<p data-node-id="new">New</p>'); render(after);
  const result = measureWebHTMLReview(document, [{ id: 'a', nodeIds: [], before, after }]).a!;
  expect(result.some(r => r.nodeId === 'new' && r.kind === 'added')).toBe(true);
  expect(result.some(r => r.kind === 'removed' && r.nodeId === '')).toBe(true);
  expect(measureWebHTMLReview(document, [{ id: 'b', nodeIds: [], before: after, after: '<style>h1{color:red}</style>' + after }]).b?.some(r => r.kind === 'page')).toBe(true);
});
it("does not point an older result at a node which has changed again", () => {
  render(before.replace('Before', 'Newer'));
  expect(measureWebHTMLReview(document, [{ id: 'a', nodeIds: [], before, after: before.replace('Before', 'After') }]).a?.map(r => r.kind)).toEqual(['page']);
});
