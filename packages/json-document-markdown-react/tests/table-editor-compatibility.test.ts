import {expect, test} from "vitest";
import {createMarkdownTableEditor as canonical} from "@interactive-os/json-document-editing";
import {createMarkdownTableEditor as legacy} from "../src/index.js";
test("legacy React export delegates to the canonical source editor", () => {expect(legacy).toBe(canonical);});
