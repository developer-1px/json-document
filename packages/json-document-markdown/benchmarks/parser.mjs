import assert from "node:assert/strict";
import { createMarkdownParser, projectMarkdown } from "../dist/index.js";

const stats = values => {
  const sorted = values.toSorted((a, b) => a - b);
  return { median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * .95) - 1] };
};
const unit = "Start **strong text** and __more text__ with ordinary letters.\n";
console.log(JSON.stringify({ node: process.version, samples: 60, warmup: 10 }));
for (const size of [1000, 10000, 50000, 100000]) {
  for (const shape of ["single-paragraph", "many-paragraphs"]) {
    const chunk = unit + (shape === "many-paragraphs" ? "\n" : "");
    const source = chunk.repeat(Math.ceil(size / chunk.length)).slice(0, size);
    const from = source.indexOf("ordinary", Math.floor(size / 2)) + 2;
    for (const edit of ["letter", "inline-syntax", "block-boundary"]) {
      const parser = createMarkdownParser(source);
      const incremental = [], full = [], affected = [];
      for (let i = 0; i < 70; i++) {
        const insert = edit === "letter" ? "x" : edit === "inline-syntax" ? "*x*" : "\n\n";
        const start = performance.now();
        const update = parser.update(from, from, insert);
        // Include materialization of the public strong ranges in both timings.
        update.projection.strong;
        const elapsed = performance.now() - start;
        const fullStart = performance.now();
        const expected = projectMarkdown(source.slice(0, from) + insert + source.slice(from));
        expected.strong;
        const fullElapsed = performance.now() - fullStart;
        assert.deepEqual(update.projection, expected);
        if (i >= 10) { incremental.push(elapsed); full.push(fullElapsed); affected.push(update.changed.newTo - update.changed.from); }
        assert.deepEqual(parser.update(from, from + insert.length, "").projection, projectMarkdown(source));
      }
      console.log(JSON.stringify({ size, shape, edit, incremental: stats(incremental), full: stats(full), affected: stats(affected) }));
    }
  }
}
