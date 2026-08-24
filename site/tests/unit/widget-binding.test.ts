import { describe, expect, test } from "vitest";
import { gridCellProps, optionProps, treeItemProps } from "../../src/shared/widget-binding";

describe("optionProps", () => {
  test("maps selection marks to widget props", () => {
    const props = optionProps({
      getIsSelected: () => true,
      getIsFocus: () => false,
      getTextOffset: () => null,
      getPressHandler: () => handler,
    });
    expect(props.selected).toBe(true);
    expect(props.focus).toBe(false);
    expect(props["aria-selected"]).toBe(true);
    expect(props.onClick).toBe(handler);
  });
});

describe("gridCellProps", () => {
  test("maps selection marks to gridcell props", () => {
    const props = gridCellProps({
      getIsSelected: () => true,
      getIsFocus: () => true,
      getTextOffset: () => null,
      getPressHandler: () => handler,
    });
    expect(props.role).toBe("gridcell");
    expect(props.tabIndex).toBe(0);
    expect(props.selected).toBe(true);
    expect(props.onClick).toBe(handler);
  });
});

describe("treeItemProps", () => {
  test("maps selection marks to treeitem props", () => {
    const props = treeItemProps({
      getIsSelected: () => false,
      getIsFocus: () => true,
      getTextOffset: () => null,
      getPressHandler: () => handler,
    });
    expect(props.role).toBe("treeitem");
    expect(props.focus).toBe(true);
    expect(props.onClick).toBe(handler);
  });
});

function handler() {}
