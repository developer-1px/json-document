import { describe, expect, test } from "vitest";
import {
  integrationPageDescriptors,
  legacyPageRedirects,
  pageDescriptor,
  pageDescriptors,
} from "../../src/app/page-descriptors";

describe("public page descriptors", () => {
  test("owns integration pages and related demos in canonical descriptors", () => {
    expect(integrationPageDescriptors("adapter")).toHaveLength(3);
    expect(integrationPageDescriptors("connector")).toHaveLength(5);
    expect(pageDescriptors.filter(({ parentPath }) => parentPath === "/connectors/zod").map(({ path, label, relatedDemoLabel }) => ({
      path,
      label: relatedDemoLabel ?? label,
    }))).toEqual([
      { path: "/connectors/zod/validate", label: "Validate commits" },
    ]);
  });

  test("keeps related demos and legacy redirects on known canonical pages", () => {
    for (const descriptor of pageDescriptors) {
      if (descriptor.relatedDemoPath !== undefined) {
        expect(pageDescriptor(descriptor.relatedDemoPath).path).toBe(descriptor.relatedDemoPath);
      }
    }

    for (const redirect of Object.values(legacyPageRedirects)) {
      expect(pageDescriptors.some(({ path }) => path === redirect.from)).toBe(false);
      expect(pageDescriptor(redirect.to).path).toBe(redirect.to);
    }
  });
});
