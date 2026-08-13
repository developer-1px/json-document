import { describe, expect, test } from "vitest";
import { readJSONState, urlWithJSONState, urlWithoutJSONState } from "../../src/shared/url-json-state";

describe("JSON URL state", () => {
  test("round-trips JSON values without changing unrelated query parameters", () => {
    const value = { blocks: [{ id: "한글", text: "A & B" }] };
    const shared = urlWithJSONState("https://example.test/demo?source=showcase", value);

    expect(readJSONState(new URL(shared).search)).toEqual(value);
    expect(new URL(shared).searchParams.get("source")).toBe("showcase");
    expect(urlWithoutJSONState(shared)).toBe("https://example.test/demo?source=showcase");
  });

  test("returns null for missing or malformed state", () => {
    expect(readJSONState("")).toBeNull();
    expect(readJSONState("?state=%7Bbroken")).toBeNull();
  });
});
