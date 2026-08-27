import { describe, expect, test } from "vitest";
import { createViewportPositionSession } from "../src/index.js";

describe("Viewport position session", () => {
  test("creates trailing scroll range before positioning an exact target", () => {
    const frames: Array<() => void> = [];
    const reserveWrites: number[] = [];
    const scrolls: Array<{ top: number; behavior: string }> = [];
    let tailReserve = 0;
    const session = createViewportPositionSession<string>({
      measure: (key) => key === "submitted" ? {
        targetOffset: 900,
        tailReserveOffset: 1_250,
        viewportHeight: 600,
      } : null,
      setTailReserve: (_key, height) => {
        reserveWrites.push(height);
        const changed = tailReserve !== height;
        tailReserve = height;
        return changed;
      },
      scrollTo: (top, behavior) => scrolls.push({ top, behavior }),
      scheduleFrame: (callback) => { frames.push(callback); return () => undefined; },
    });

    session.position("submitted", 96);
    expect(reserveWrites).toEqual([154]);
    frames.at(-1)?.();
    expect(scrolls).toEqual([{ top: 804, behavior: "smooth" }]);
    expect(session.getSnapshot()).toMatchObject({ owned: true, tailReserve: 154, viewportOffset: 96 });
  });

  test("supports another desired viewport position and reconciles growing content", () => {
    const frames: Array<() => void> = [];
    const scrolls: number[] = [];
    let tailReserve = 0;
    let tailReserveOffset = 1_250;
    const session = createViewportPositionSession<string>({
      measure: () => ({ targetOffset: 900, tailReserveOffset, viewportHeight: 600 }),
      setTailReserve: (_key, height) => {
        const changed = tailReserve !== height;
        tailReserve = height;
        return changed;
      },
      scrollTo: (top) => scrolls.push(top),
      scheduleFrame: (callback) => { frames.push(callback); return () => undefined; },
    });

    session.position("target", 240);
    frames.at(-1)?.();
    expect(scrolls).toEqual([660]);
    expect(tailReserve).toBe(10);
    tailReserveOffset = 1_350;
    session.layoutChanged();
    frames.at(-1)?.();
    frames.at(-1)?.();
    expect(tailReserve).toBe(0);
    expect(scrolls).toEqual([660]);
  });

  test("removes temporary scroll range after the target leaves the viewport", () => {
    const frames: Array<() => void> = [];
    const cancellations: string[] = [];
    let tailReserve = 0;
    const session = createViewportPositionSession<string>({
      measure: () => ({ targetOffset: 900, tailReserveOffset: 1_250, viewportHeight: 600 }),
      setTailReserve: (_key, height) => {
        const changed = tailReserve !== height;
        tailReserve = height;
        return changed;
      },
      scrollTo: () => undefined,
      scheduleFrame: (callback) => { frames.push(callback); return () => undefined; },
      onCancel: (reason) => cancellations.push(reason),
    });

    session.position("target", 96);
    session.targetVisibilityChanged(false);
    expect(session.getSnapshot().owned).toBe(true);
    frames.at(-1)?.();
    session.targetVisibilityChanged(false);
    expect(session.getSnapshot()).toMatchObject({ owned: false, tailReserve: 0, targetKey: null });
    expect(cancellations).toEqual(["target-left-viewport"]);
  });

  test("retains the requested position after completion layout clamps", () => {
    const frames: Array<() => void> = [];
    const scrolls: Array<{ top: number; behavior: string }> = [];
    let tailReserve = 0;
    const session = createViewportPositionSession<string>({
      measure: () => ({ targetOffset: 900, tailReserveOffset: 1_250, viewportHeight: 600 }),
      setTailReserve: (_key, height) => {
        const changed = tailReserve !== height;
        tailReserve = height;
        return changed;
      },
      scrollTo: (top, behavior) => scrolls.push({ top, behavior }),
      scheduleFrame: (callback) => { frames.push(callback); return () => undefined; },
    });
    session.position("target", 96);
    frames.at(-1)?.();
    session.complete();
    frames.at(-1)?.();
    expect(scrolls).toEqual([
      { top: 804, behavior: "smooth" },
      { top: 804, behavior: "instant" },
    ]);
  });
});
