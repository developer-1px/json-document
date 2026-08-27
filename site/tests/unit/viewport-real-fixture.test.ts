import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { runtimeMarkdownStreamFixture } from "../../src/routes/viewport-position-demo/runtime-markdown-stream.fixture";

describe("Viewport real-world stream fixture", () => {
  test("preserves the security-filtered production capture and its complete chunk sequence", () => {
    const capture = runtimeMarkdownStreamFixture;
    const digest = createHash("sha256").update(capture.stream.document).digest("hex");

    expect(capture.schemaVersion).toBe("json-document.runtime-markdown-stream-fixture/v1");
    expect(capture.capture.securityFilter).toBe("applied");
    expect(capture.capture.droppedEntries).toBe(0);
    expect(capture.capture.truncatedEntries).toBe(0);
    expect(capture.capture.sourceTextDeltaCount).toBe(1_052);
    expect(capture.sourceEvidence.streamMatchedTerminal).toBe(true);
    expect(digest).toBe(capture.sourceEvidence.assistantStreamSha256);
    expect(digest).toBe(capture.sourceEvidence.terminalTextSha256);
    expect(capture.stream.chunks.at(-1)?.endOffset).toBe(capture.stream.document.length);
    expect(capture.stream.chunks.every((chunk, index, chunks) =>
      index === 0 || chunk.endOffset > chunks[index - 1]!.endOffset,
    )).toBe(true);
  });
});
