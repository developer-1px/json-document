import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../../src/app/App";

beforeEach(() => {
  resetDocument("/");
});

afterEach(cleanup);

describe("official site shell", () => {
  test("serves the official overview at the root route", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: "Skip to content" }).getAttribute("href")).toBe("#main-content");
    expect(screen.getByRole("heading", { level: 1, name: "json-document" })).toBeTruthy();
    expect(screen.getByText(/Implementation-neutral JSON editing/)).toBeTruthy();
    expect(screen.getByText("3.0.0")).toBeTruthy();
    expect(screen.getByText('import { createJSONDocument } from "@interactive-os/json-document";')).toBeTruthy();
    expect(screen.getByRole("link", { name: "npm" }).getAttribute("href")).toBe("https://www.npmjs.com/package/@interactive-os/json-document");
    expect(screen.getByRole("link", { name: "GitHub" }).getAttribute("href")).toBe("https://github.com/developer-1px/json-document");
    expect(screen.getByRole("link", { name: "Try the demo" }).getAttribute("href")).toBe("/demo");
    expect(screen.getByRole("link", { name: "Connector demos" }).getAttribute("href")).toBe("/connectors");
  });

  test("navigates from the app shell to the Connector catalog", async () => {
    render(<App />);
    const user = userEvent.setup();
    const nav = within(screen.getByRole("navigation", { name: "Site navigation" }));

    expect(nav.getByRole("link", { name: "Connectors", exact: true })).toBeTruthy();
    expect(nav.getByRole("link", { name: "React", exact: true })).toBeTruthy();
    expect(nav.getByRole("link", { name: "Zod", exact: true })).toBeTruthy();
    expect(nav.getByRole("link", { name: "Sheet", exact: true })).toBeTruthy();
    expect(nav.queryByRole("link", { name: "Workbench" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Extensions" })).toBeNull();

    await user.click(nav.getByRole("link", { name: "Connectors", exact: true }));
    await waitFor(() => expect(document.title).toBe("Connectors - json-document"));
    expect(await screen.findByRole("heading", { level: 1, name: "Connectors" })).toBeTruthy();
    const demos = screen.getAllByRole("link", { name: "Open Live Demo" });
    expect(demos.map((link) => link.getAttribute("href"))).toEqual([
      "/connectors/react",
      "/connectors/zod",
    ]);
  });
});

function resetDocument(path: string) {
  document.head.innerHTML = [
    '<meta name="description" content="" />',
    '<meta property="og:title" content="" />',
    '<meta property="og:description" content="" />',
    '<meta property="og:url" content="" />',
    '<meta name="twitter:title" content="" />',
    '<meta name="twitter:description" content="" />',
    '<link rel="canonical" href="" />',
  ].join("");
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
  window.history.pushState(null, "", path);
}
