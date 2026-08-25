import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ActionLink } from "../../src/shared/ui/interactive";

afterEach(cleanup);

describe("interactive design system", () => {
  it("shows navigation direction only on prominent ActionLink", () => {
    render(<ActionLink href="#target" kind="prominent">Open demo</ActionLink>);

    const link = screen.getByRole("link", { name: "Open demo" });
    expect(link.getAttribute("href")).toBe("#target");
    expect(link.textContent).toBe("Open demo→");
  });
});
