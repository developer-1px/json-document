import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { App } from "../../src/app/App";
import { docPages } from "../../src/routes/docs/doc-pages";

vi.mock("../../src/shared/demo-workbench/ShikiSourceCodeBlock", () => ({
  ShikiSourceCodeBlock: ({ source }: { source: string }) => <pre><code>{source}</code></pre>,
}));

beforeEach(() => {
  Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
});
afterEach(cleanup);

test.each(Object.values(docPages).filter((page) => page.path.startsWith("/docs/api/")))(
  "$path renders its own package reference rather than the parent Core guide",
  async (page) => {
    window.history.pushState(null, "", page.path);
    render(<App />);
    await waitFor(() => expect(document.title).toBe(page.title));
    expect(await screen.findByRole("heading", { level: 1, name: page.title.replace(/ - json-document$/, "") })).toBeTruthy();
    const firstSymbol = /^## `([^`]+)`/m.exec(page.source)?.[1];
    expect(firstSymbol).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: firstSymbol!, exact: true })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1, name: "JSON Document Protocol" })).toBeNull();
  },
);
