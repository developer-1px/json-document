import { describe, expect, test } from "vitest";
import {
  integrationPageDescriptors,
  legacyPageRedirects,
  pageDescriptor,
  pageDescriptors,
} from "../../src/app/page-descriptors";
import { adapterCatalog } from "../../src/routes/adapters/adapter-catalog";
import { connectorCatalog } from "../../src/routes/connectors/connector-catalog";

describe("public page descriptors", () => {
  test("derive adapter and connector catalogs from integration metadata", () => {
    expect(adapterCatalog.map(({ demoPath }) => demoPath)).toEqual(
      integrationPageDescriptors("adapter").map(({ path }) => path),
    );
    expect(connectorCatalog.map(({ demoPath }) => demoPath)).toEqual(
      integrationPageDescriptors("connector").map(({ path }) => path),
    );
    expect(connectorCatalog.find(({ id }) => id === "zod")?.moreDemos).toEqual([
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
