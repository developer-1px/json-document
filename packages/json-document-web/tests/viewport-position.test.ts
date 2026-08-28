import { describe, expect, test } from "vitest";
import { createWebViewportPositionPorts } from "../src/index.js";

describe("Web viewport position ports", () => {
  test("projects target geometry, trailing range writes, and scroll behavior", () => {
    const tailReserve = element(770);
    const scrolls: Array<{ top: number; behavior: string }> = [];
    const viewport = viewportElement(scrolls);
    const ports = createWebViewportPositionPorts<string>({
      viewport,
      findTarget: (key) => key === "submitted" ? element(420) : null,
      findTailReserve: (key) => key === "submitted" ? tailReserve : null,
      requestFrame: () => 1,
      cancelFrame: () => undefined,
    });

    expect(ports.measure("submitted")).toEqual({
      targetOffset: 700,
      tailReserveOffset: 1_050,
      viewportHeight: 600,
    });
    expect(ports.setTailReserve("submitted", 154)).toBe(true);
    expect(ports.setTailReserve("submitted", 154)).toBe(false);
    ports.scrollTo(604, "smooth");
    expect(scrolls).toEqual([{ top: 604, behavior: "smooth" }]);
  });

  test("observes layout and exact target visibility with cleanup", () => {
    const disconnected: string[] = [];
    const observed: string[] = [];
    const visibility: boolean[] = [];
    const target = element(420);
    const ports = createWebViewportPositionPorts<string>({
      viewport: viewportElement([]),
      content: {},
      findTarget: () => target,
      findTailReserve: () => element(770),
      createResizeObserver: () => observer("resize", observed, disconnected),
      createMutationObserver: () => observer("mutation", observed, disconnected),
      createVisibilityObserver: (callback) => ({
        observe: (element) => { observed.push(element === target ? "visibility" : "wrong"); callback(true); },
        disconnect: () => { disconnected.push("visibility"); },
      }),
      requestFrame: () => 1,
      cancelFrame: () => undefined,
    });
    const stopLayout = ports.observeLayout(() => undefined);
    const stopVisibility = ports.observeTargetVisibility("target", (visible) => visibility.push(visible));
    expect(observed).toEqual(["resize", "resize", "mutation", "visibility"]);
    expect(visibility).toEqual([true]);
    stopLayout();
    stopVisibility();
    expect(disconnected).toEqual(["resize", "mutation", "visibility"]);
  });

  test("positions without trailing range and translates user viewport interaction", () => {
    const interactions: string[] = [];
    const viewport = viewportElement([]);
    const ports = createWebViewportPositionPorts<string>({
      viewport,
      findTarget: () => element(420),
      requestFrame: () => 1,
      cancelFrame: () => undefined,
    });

    expect(ports.measure("07")).toEqual({
      targetOffset: 700,
      tailReserveOffset: Number.POSITIVE_INFINITY,
      viewportHeight: 600,
    });
    expect(ports.setTailReserve("07", 100)).toBe(false);
    const stop = ports.observeUserInteraction(() => interactions.push("claimed"));
    viewport.emit("wheel");
    viewport.emit("pointerdown");
    stop();
    viewport.emit("wheel");
    expect(interactions).toEqual(["claimed", "claimed"]);
  });
});

function element(top: number) {
  return { style: { height: "0px" }, getBoundingClientRect: () => ({ top }) };
}

function viewportElement(scrolls: Array<{ top: number; behavior: string }>) {
  const listeners = new Map<string, Set<() => void>>();
  return {
    clientHeight: 600,
    scrollTop: 300,
    getBoundingClientRect: () => ({ top: 20 }),
    scrollTo: (options: { top: number; behavior: "smooth" | "instant" }) => scrolls.push(options),
    addEventListener: (type: "wheel" | "pointerdown", listener: () => void) => {
      const current = listeners.get(type) ?? new Set();
      current.add(listener);
      listeners.set(type, current);
    },
    removeEventListener: (type: "wheel" | "pointerdown", listener: () => void) => listeners.get(type)?.delete(listener),
    emit: (type: "wheel" | "pointerdown") => listeners.get(type)?.forEach((listener) => listener()),
  };
}

function observer(name: string, observed: string[], disconnected: string[]) {
  return {
    observe: () => { observed.push(name); },
    disconnect: () => { disconnected.push(name); },
  };
}
