import { createJSONDocument } from "@interactive-os/json-document";
import {
  createRichTextBlockFixture,
  createRichTextEditor,
} from "@interactive-os/json-document-rich-text";
import { benchmarkConfig, measure, reportScaling } from "../../../benchmarks/measure.mjs";
import { richTextRenderStore } from "../dist/render-store.js";

const config = benchmarkConfig("PERF_RICH_TEXT_REACT_BLOCKS", [1_000, 10_000]);
const rows = [];

console.log("json-document Rich Text React placeholder benchmark");
console.log(`blocks=${config.sizes.join(",")} rounds=${config.rounds} warmups=${config.warmups}`);

for (const size of config.sizes) {
  const middle = Math.floor(size / 2);
  const result = measure(config, `${size} blocks local insert`, () => {
    const editor = createRichTextEditor({
      document: createJSONDocument(createRichTextBlockFixture(size, { idPrefix: `p${size}` })),
      selection: collapsed(`p${size}-text-${middle}`, 1),
    });
    richTextRenderStore(editor).subscribePlaceholder(() => {});
    return () => editor.dispatch({ type: "text.insert", text: "y" }).ok;
  });
  rows.push({ size, ...result });
}

reportScaling(rows);

function collapsed(nodeId, offset) {
  const point = { kind: "text", nodeId, offset, affinity: "forward" };
  return { kind: "range", ranges: [{ anchor: point, focus: point }], primaryIndex: 0 };
}
