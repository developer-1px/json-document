import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { UIComponentContent } from "@interactive-os/json-document-object-document";
import type { UIComponentInteraction } from "../src/ui-component-view.js";
import { renderUIComponentControl } from "../src/ui-component-controls.js";

afterEach(cleanup);
function setup(component: UIComponentContent["component"], extra: Partial<UIComponentContent> = {}) {
  const interaction: UIComponentInteraction = {busy: false, selectedItem: 0, onAction: vi.fn(), onValueChange: vi.fn(), onSelectItem: vi.fn(), onPropsChange: vi.fn(), onNavigate: vi.fn()};
  const content: UIComponentContent = {component, detail: "", items: [], tone: "default", ...extra};
  render(renderUIComponentControl({text: "대상", content, interaction}));
  return interaction;
}
test("numeric steps clamp and preserve number type", () => {
  const interaction = setup("value-input", {value: 9, props: {min: 0, max: 10, step: 3, presentation: "stepped"}});
  fireEvent.click(screen.getByRole("button", {name: "Increase 대상"}));
  expect(interaction.onValueChange).toHaveBeenCalledWith(10);
});
test("date range edits serialize both ordered endpoints as properties", () => {
  const interaction = setup("date-range-picker", {props: {start: "2026-10-10", end: "2026-10-12"}});
  const start = screen.getByLabelText("대상 start");
  fireEvent.change(start, {target: {value: "2026-10-15"}});
  fireEvent.blur(start);
  expect(interaction.onPropsChange).toHaveBeenCalledWith({start: "2026-10-12", end: "2026-10-15"});
});
test("navigation dispatches the saved destination rather than an action", () => {
  const interaction = setup("page-link", {targetPageId: "detail"});
  fireEvent.click(screen.getByRole("button", {name: "대상"}));
  expect(interaction.onNavigate).toHaveBeenCalledWith("detail");
  expect(interaction.onAction).not.toHaveBeenCalled();
});
