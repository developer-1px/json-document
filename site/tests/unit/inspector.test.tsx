import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import { Inspector } from "../../src/shared/ui/inspector";

afterEach(cleanup);

describe("Inspector", () => {
  const items = [
    { label: "Canonical JSON", testId: "document-json", value: { title: "Draft" } },
    { label: "Selection", testId: "selection-json", value: { focus: "alpha" } },
  ] as const;

  test("keeps every regression value mounted while closed", () => {
    render(<Inspector items={items} />);

    expect(screen.getByRole("button", { name: "Inspect editing state" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByTestId("document-json")).toBeTruthy();
    expect(screen.getByTestId("selection-json")).toBeTruthy();
    expect(screen.getByLabelText("Inspect editing state").hasAttribute("hidden")).toBe(true);
  });

  test("opens without blocking the demo and switches the visible value", async () => {
    const user = userEvent.setup();
    render(<Inspector items={items} />);

    await user.click(screen.getByRole("button", { name: "Inspect editing state" }));
    expect(screen.getByLabelText("Inspect editing state").hasAttribute("hidden")).toBe(false);
    expect(screen.getByRole("tab", { name: "Canonical JSON" }).getAttribute("aria-selected")).toBe("true");

    await user.click(screen.getByRole("tab", { name: "Selection" }));
    expect(screen.getByRole("tab", { name: "Selection" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("document-json").closest('[role="tabpanel"]')?.hasAttribute("hidden")).toBe(true);
    expect(screen.getByTestId("selection-json").closest('[role="tabpanel"]')?.hasAttribute("hidden")).toBe(false);
  });

  test("can start open when the product treats inspector as part of the primary workbench", () => {
    render(<Inspector defaultOpen placement="inline" items={items} />);

    expect(screen.getByRole("button", { name: "Inspect editing state" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText("Inspect editing state").hasAttribute("hidden")).toBe(false);
  });
});
