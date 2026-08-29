import { describe, expect, test } from "vitest";
import { createWebAnchoredFloatingPositionPorts } from "../src/index.js";

describe("Web anchored floating position", () => {
  test("measures anchor, floating content, and the viewport boundary", () => {
    const viewport = createViewport();
    const ports = createWebAnchoredFloatingPositionPorts({
      viewport,
      getAnchor: () => element(100, 120, 80, 24),
      getFloating: () => element(0, 0, 240, 180),
    });
    expect(ports.measure()).toEqual({
      anchor: { x: 100, y: 120, width: 80, height: 24 },
      floating: { x: 0, y: 0, width: 240, height: 180 },
      boundary: { x: 0, y: 0, width: 800, height: 600 },
    });
  });

  test("uses an explicit clipping boundary", () => {
    const ports = createWebAnchoredFloatingPositionPorts({
      viewport: createViewport(),
      getAnchor: () => element(100, 120, 80, 24),
      getFloating: () => element(0, 0, 240, 180),
      getBoundary: () => element(40, 50, 500, 400),
    });
    expect(ports.measure()?.boundary).toEqual({ x: 40, y: 50, width: 500, height: 400 });
  });

  test("coalesces resize and captured scroll observations and cleans up", () => {
    const viewport = createViewport();
    const observed: object[] = [];
    const disconnected: string[] = [];
    let updates = 0;
    const ports = createWebAnchoredFloatingPositionPorts({
      viewport,
      getAnchor: () => element(100, 120, 80, 24),
      getFloating: () => element(0, 0, 240, 180),
      createResizeObserver: () => ({
        observe: (target) => observed.push(target),
        disconnect: () => disconnected.push("resize"),
      }),
    });
    const stop = ports.observe(() => { updates += 1; });
    viewport.emit("scroll");
    viewport.emit("resize");
    expect(updates).toBe(0);
    viewport.flushFrame();
    expect(updates).toBe(1);
    expect(observed).toHaveLength(2);
    stop();
    viewport.emit("scroll");
    viewport.flushFrame();
    expect(updates).toBe(1);
    expect(disconnected).toEqual(["resize"]);
  });
});

function element(x: number, y: number, width: number, height: number) {
  return { getBoundingClientRect: () => ({ x, y, left: x, top: y, width, height }) };
}

function createViewport() {
  const listeners = new Map<string, Set<() => void>>();
  let frame: (() => void) | null = null;
  return {
    innerWidth: 800,
    innerHeight: 600,
    addEventListener(type: "resize" | "scroll", listener: () => void) {
      const current = listeners.get(type) ?? new Set();
      current.add(listener);
      listeners.set(type, current);
    },
    removeEventListener(type: "resize" | "scroll", listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
    requestAnimationFrame(callback: () => void) { frame = callback; return 1; },
    cancelAnimationFrame() { frame = null; },
    emit(type: "resize" | "scroll") { listeners.get(type)?.forEach((listener) => listener()); },
    flushFrame() { const callback = frame; frame = null; callback?.(); },
  };
}
