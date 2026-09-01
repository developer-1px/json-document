import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import {
  contentInteractionAttributes,
  GridCell,
  SelectableItem,
} from "../src/index.js";

describe("content interaction projection", () => {
  test("projects selectable content phases without replacing selection", () => {
    const { getByRole, rerender } = render(<SelectableItem selected active>Item</SelectableItem>);
    const item = getByRole("button");
    expect(item.dataset.uiInteraction).toBe("content");
    expect(item.dataset.uiInteractionPhase).toBe("active");
    expect(item.dataset.selected).toBe("true");
    rerender(<SelectableItem selected primary>Item</SelectableItem>);
    expect(item.dataset.primary).toBe("true");
    expect(item.dataset.elevated).toBe("true");
    rerender(<SelectableItem selected dragging>Item</SelectableItem>);
    expect(item.dataset.uiInteractionPhase).toBe("dragging");
    expect(item.dataset.elevated).toBe("true");
  });

  test("uses the same projection for grid cells", () => {
    const { getByRole } = render(<table><tbody><tr><GridCell selected focus>Cell</GridCell></tr></tbody></table>);
    const cell = getByRole("gridcell");
    expect(cell.dataset.uiInteraction).toBe("content");
    expect(cell.dataset.selected).toBe("true");
    expect(cell.dataset.focus).toBe("true");
  });

  test("projects insertion without selected semantics", () => {
    expect(contentInteractionAttributes({ role: "insertion", active: true })).toEqual({
      "data-ui-interaction": "insertion",
      "data-ui-interaction-phase": "active",
    });
  });
});
