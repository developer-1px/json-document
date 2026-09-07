import { existsSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { discoverDemoSources } from "../../src/shared/demo-workbench/demo-sources";

const source = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

describe("A2UI canonical owner", () => {
  test("connects executable public Usage to the owner implementation and reference", async () => {
    const files = await discoverDemoSources("routes/connectors/a2ui/A2uiConnectorDemoRoute.tsx");
    expect(files.find(({ path }) => path === "packages/json-document-a2ui/src/index.ts")?.referencePath).toBe("/docs/api/a2ui");
  });
  test("does not restore a private engine or envelope parser in the Host", () => {
    expect(existsSync(new URL("../../src/app/a2ui-streaming-document/a2ui-streaming-document.ts", import.meta.url))).toBe(false);
    expect(source("src/routes/llm-agent-artifact/LlmAgentArtifactRoute.tsx")).toContain('from "@interactive-os/json-document-a2ui"');
    expect(source("src/app/a2ui-streaming-document/a2ui-fence.ts")).toContain('from "@interactive-os/json-document-a2ui"');
    expect(source("src/app/a2ui-streaming-document/a2ui-fence.ts")).not.toContain("A2uiMessageSchema");
  });
});
