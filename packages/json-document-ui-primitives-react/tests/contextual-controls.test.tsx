import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { ContextualControls } from "../src/index.js";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const capabilities = [{ id: "edit", phases: ["approach", "editing"] as const }];
test("pointer and keyboard share visibility, and focus survives pointer leave", () => {
  const rootRef = createRef<HTMLDivElement>();
  render(<ContextualControls rootRef={rootRef} capabilities={capabilities}>{state => <><input aria-label="cell" /><output>{state.visible.join(",") || "hidden"}</output></>}</ContextualControls>);
  expect(screen.getByRole("status").textContent).toBe("hidden");
  fireEvent.pointerEnter(rootRef.current!);
  expect(screen.getByRole("status").textContent).toBe("edit");
  fireEvent.focus(screen.getByRole("textbox"));
  fireEvent.pointerLeave(rootRef.current!);
  expect(screen.getByRole("status").textContent).toBe("edit");
  fireEvent.blur(screen.getByRole("textbox"), { relatedTarget: document.body });
  expect(screen.getByRole("status").textContent).toBe("hidden");
});
test("no-hover discovery uses the same affordance and disposes its media subscription", () => {
  const remove = vi.fn();
  let changed: (() => void) | undefined;
  const media = { matches: true, addEventListener: vi.fn((_name, listener) => { changed = listener; }), removeEventListener: remove };
  vi.stubGlobal("matchMedia", vi.fn(() => media));
  const { unmount } = render(<ContextualControls revealWithoutHover capabilities={capabilities}>{state => <output>{state.visible.join(",")}</output>}</ContextualControls>);
  expect(screen.getByRole("status").textContent).toBe("edit");
  expect(changed).toBeTypeOf("function");
  unmount();
  expect(remove).toHaveBeenCalledWith("change", changed);
  vi.unstubAllGlobals();
});
