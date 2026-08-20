import { describe, expect, test } from "vitest";
import { historyCommands, optionProps } from "../../src/routes/widgets/binding";

describe("historyCommands", () => {
  test("binds disabled to canUndo and canRedo", () => {
    expect(historyCommands({ canUndo: false, canRedo: false })).toEqual({
      undo: { name: "undo", disabled: true },
      redo: { name: "redo", disabled: true },
    });
    expect(historyCommands({ canUndo: true, canRedo: false })).toEqual({
      undo: { name: "undo", disabled: false },
      redo: { name: "redo", disabled: true },
    });
    expect(historyCommands({ canUndo: true, canRedo: true })).toEqual({
      undo: { name: "undo", disabled: false },
      redo: { name: "redo", disabled: false },
    });
  });
});

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

function handler() {}
