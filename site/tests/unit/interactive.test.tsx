import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  ActionButton,
  ActionLink,
  DisclosureButton,
  IconButton,
  SelectableItem,
  ToggleButton,
} from "../../src/shared/ui/interactive";
import { ui } from "../../src/shared/ui/styles";

afterEach(cleanup);

describe("interactive design system", () => {
  it("keeps action and disabled state in ActionButton", () => {
    render(<ActionButton kind="danger" disabled>Delete</ActionButton>);

    const button = screen.getByRole("button", { name: "Delete" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.className).toContain("disabled:cursor-not-allowed");
    expect(button.className).toContain("text-foreground-accent");
  });

  it("shows navigation direction only on prominent ActionLink", () => {
    render(<ActionLink href="#target" kind="prominent">Open demo</ActionLink>);

    const link = screen.getByRole("link", { name: "Open demo" });
    expect(link.getAttribute("href")).toBe("#target");
    expect(link.textContent).toBe("Open demo→");
  });

  it("owns pressed state in ToggleButton", () => {
    render(<ToggleButton pressed>Filter</ToggleButton>);

    expect(screen.getByRole("button", { name: "Filter" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("owns expanded state and target in DisclosureButton", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <DisclosureButton expanded controls="inspector" onClick={() => { clicked = true; }}>
        Inspect
      </DisclosureButton>,
    );

    const button = screen.getByRole("button", { name: "Inspect" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-controls")).toBe("inspector");
    await user.click(button);
    expect(clicked).toBe(true);
  });

  it("owns selected state while preserving the selected element", () => {
    render(<SelectableItem selected type="button">Block</SelectableItem>);

    const item = screen.getByRole("button", { name: "Block" });
    expect(item.getAttribute("data-selected")).toBe("true");
    expect(item.getAttribute("data-focus")).toBe("false");
    expect(item.className).toContain("data-[selected=true]:outline-line-accent");
    expect(item.className).not.toContain("data-[selected=true]:relative");
  });

  it("keeps plane items absolutely positioned while selected", () => {
    render(<SelectableItem selected className={ui.interactive.planeItem}>Block</SelectableItem>);

    const item = screen.getByRole("button", { name: "Block" });
    expect(item.className).toContain("absolute");
    expect(item.className).not.toContain("!absolute");
  });

  it("owns focus separately from selected", () => {
    render(<SelectableItem selected focus type="button">Block</SelectableItem>);

    const item = screen.getByRole("button", { name: "Block" });
    expect(item.getAttribute("data-selected")).toBe("true");
    expect(item.getAttribute("data-focus")).toBe("true");
  });

  it("gives icon-only actions a label and tooltip", () => {
    render(<IconButton label="Copy"><span aria-hidden="true">□</span></IconButton>);

    const button = screen.getByRole("button", { name: "Copy" });
    expect(button.getAttribute("title")).toBe("Copy");
  });
});
