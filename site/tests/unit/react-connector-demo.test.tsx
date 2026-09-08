import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ReactConnectorLab } from "../../src/routes/connectors/react/ReactConnectorLab";
import { discoverDemoSources } from "../../src/shared/demo-workbench/demo-sources";

afterEach(cleanup);

describe("React Connector public Usage", () => {
  test("validates JSON and reads fragment addresses through registered Core owners", async () => {
    render(<ReactConnectorLab />);
    expect(screen.getByTestId("json-value-valid").textContent).toBe("Valid JSON value");
    expect(JSON.parse(screen.getByTestId("json-value-read").textContent!)).toMatchObject({ ok: true, value: "Draft" });
    for (const name of ["Non-finite number", "Sparse array"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(screen.getByTestId("json-value-valid").textContent).toBe("Not a JSON value");
      expect(JSON.parse(screen.getByTestId("json-value-read").textContent!)).toBeNull();
    }
    fireEvent.click(screen.getByRole("button", { name: "Nested value" }));
    expect(JSON.parse(screen.getByTestId("json-value-read").textContent!)).toMatchObject({ ok: true, value: "Draft" });
    const sources = await discoverDemoSources("routes/connectors/react/ReactConnectorDemoRoute.tsx");
    for (const path of ["packages/json-document/src/foundation/protocol/read.ts", "packages/json-document/src/foundation/json/serializable.ts"]) {
      const owner = sources.find((source) => source.path === path);
      expect(owner?.referencePath).toBe("/docs/api/json-document");
      expect(await owner!.load()).toContain("export function");
    }
  });

  test("executes context-aware tracking and exposes its canonical owner", async () => {
    render(<ReactConnectorLab />);
    expect(screen.getByRole("button", { name: "Array insertion" }).textContent).toBe("Array insertion");
    expect(screen.getByTestId("tracked-pointer").textContent).toBe("/items/2");
    fireEvent.click(screen.getByRole("button", { name: "Numeric object key" }));
    expect(screen.getByTestId("tracked-pointer").textContent).toBe("/items/1");
    fireEvent.click(screen.getByRole("button", { name: "Array insertion" }));
    expect(screen.getByTestId("tracked-pointer").textContent).toBe("/items/2");
    const sources = await discoverDemoSources("routes/connectors/react/ReactConnectorDemoRoute.tsx");
    expect(sources.map((source) => source.path)).toContain("packages/json-document/src/foundation/patch/track.ts");
  });
});
