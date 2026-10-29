import {describe, expect, it} from "vitest";
import {assertUIComponentContent, createUIComponentObject, uiComponentCatalog} from "../src/ui-component.js";

describe("canonical UI catalog", () => {
  it("all registered defaults validate and retain unique public capabilities", () => {
    expect(new Set(uiComponentCatalog.map(entry => entry.id)).size).toBe(uiComponentCatalog.length);
    for (const entry of uiComponentCatalog) {
      const object = createUIComponentObject(entry.id, {x: 0, y: 0});
      expect(() => assertUIComponentContent(object.document)).not.toThrow();
      expect(entry.source).toContain("packages/");
    }
    expect(uiComponentCatalog.filter(entry => entry.category === "feedback")).toHaveLength(31);
    expect(uiComponentCatalog.find(entry => entry.id === "table")?.bindingTargets).not.toContain("value");
  });
  it("legacy documents remain valid and invalid component configuration is rejected", () => {
    const legacy = {component: "heading", detail: "", items: [], tone: "default"};
    expect(() => assertUIComponentContent(legacy)).not.toThrow();
    expect(() => assertUIComponentContent({...legacy, props: {inventedCSS: "red"}})).toThrow();
    expect(() => assertUIComponentContent({...legacy, component: "toggle", props: {presentation: "invented"}})).toThrow();
    expect(() => assertUIComponentContent({...legacy, component: "table", collection: {tableId: "products", fieldIds: ["name", "stock"]}})).not.toThrow();
    expect(() => assertUIComponentContent({...legacy, childIds: ["a", "a"]})).toThrow();
  });
});
