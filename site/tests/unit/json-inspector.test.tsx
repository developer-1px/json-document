import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { JsonInspector } from "../../src/shared/ui/json-inspector";

afterEach(cleanup);

describe("JsonInspector", () => {
  test("preserves JSON text while separating line numbers from code semantics", () => {
    const value = { title: "Draft", count: 2, ready: true, empty: null };
    const { container } = render(<JsonInspector label="Canonical JSON" testId="json" value={value} />);

    const lines = [...container.querySelectorAll("[data-json-line]")].map((line) => line.textContent).join("\n");
    expect(lines).toBe(JSON.stringify(value, null, 2));
    expect(screen.getByTestId("json").querySelectorAll('[aria-hidden="true"]')).toHaveLength(6);
    expect(screen.getByTestId("json").querySelector('[data-line-number="1"]')?.textContent).toBe("");
  });

  test("assigns the restrained shared palette by JSON token role", () => {
    render(<JsonInspector label="Canonical JSON" testId="json" value={{ title: "Draft", count: 2, ready: true, empty: null }} />);

    const output = screen.getByTestId("json");
    expect(output.querySelector('[data-json-token="key"]')?.textContent).toBe('"title"');
    expect(output.querySelector('[data-json-token="string"]')?.textContent).toBe('"Draft"');
    expect([...output.querySelectorAll('[data-json-token="literal"]')].map((token) => token.textContent)).toEqual(["2", "true", "null"]);
    expect(output.querySelectorAll('[data-json-token="punctuation"]').length).toBeGreaterThan(0);
  });
});
