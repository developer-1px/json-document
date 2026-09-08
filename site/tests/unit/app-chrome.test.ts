import { describe, expect, test } from "vitest";
import { isAppChrome, pageDescriptors } from "../../src/app/page-descriptors";

describe("isAppChrome", () => {
  test("marks Calendar as a full-screen app surface", () => {
    expect(isAppChrome(pageDescriptors.find((route) => route.path === "/applications/calendar"))).toBe(true);
    expect(isAppChrome(pageDescriptors.find((route) => route.path === "/applications/ai-agent"))).toBe(true);
  });

  test("keeps documentation routes on page chrome", () => {
    expect(isAppChrome(pageDescriptors.find((route) => route.path === "/editors"))).toBe(false);
    expect(isAppChrome(pageDescriptors.find((route) => route.path === "/demo/order"))).toBe(false);
  });
});
