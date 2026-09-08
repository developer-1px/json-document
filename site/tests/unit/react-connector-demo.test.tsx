import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ReactConnectorLab } from "../../src/routes/connectors/react/ReactConnectorLab";
import { discoverDemoSources } from "../../src/shared/demo-workbench/demo-sources";

afterEach(cleanup);

describe("React Connector public Usage", () => {
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
