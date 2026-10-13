import {describe, expect, it} from "vitest";
import {assertUIFlowLayout, resolveUIFlowLayout, type UIFlowLayout} from "../src/ui-flow.js";
import {createUIComponentObject} from "../src/ui-component.js";

describe("published UI flow", () => {
  it("rejects duplicate references and invalid column or sizing contracts", () => {
    const column = {weight: 1, items: [{objectId: "title", size: "fill"}]};
    for (const value of [
      {rows: [{columns: [column, column]}]},
      {rows: [{columns: [{...column, weight: 0}]}]},
      {rows: [{columns: [{...column, weight: 1.5}]}]},
      {rows: [{columns: [{...column, items: [{objectId: "title", size: "fixed"}]}]}]},
      {rows: [{columns: []}]},
    ]) expect(() => assertUIFlowLayout(value)).toThrow();
  });

  it("keeps published order, prunes removed references and includes new elements without changing edit geometry", () => {
    const objects = [
      {...createUIComponentObject("button", {x: 10, y: 20}), id: "new-button"},
      {...createUIComponentObject("heading", {x: 50, y: 80}), id: "title"},
      {...createUIComponentObject("text", {x: 5, y: 20}), id: "new-body"},
    ];
    const before = JSON.stringify(objects);
    const flow: UIFlowLayout = {rows: [{columns: [
      {weight: 1, items: [{objectId: "removed", size: "fill"}]},
      {weight: 3, items: [{objectId: "title", size: "fill"}]},
    ]}]};
    expect(resolveUIFlowLayout(objects, flow)).toEqual({rows: [
      {columns: [{weight: 3, items: [{objectId: "title", size: "fill"}]}]},
      {columns: [{weight: 1, items: [{objectId: "new-body", size: "fill"}, {objectId: "new-button", size: "hug"}]}]},
    ]});
    expect(JSON.stringify(objects)).toBe(before);
    expect(flow.rows[0]!.columns).toHaveLength(2);
    expect(resolveUIFlowLayout([], flow)).toEqual({rows: []});
  });
});
