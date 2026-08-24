import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDemoObservation } from "../../src/shared/demo-workbench/use-demo-observation";

type Intent = { readonly type: "save"; readonly value: string };

describe("useDemoObservation", () => {
  it("records a dispatched intent, result, and host message", () => {
    const { result } = renderHook(() => useDemoObservation<Intent>("Ready"));
    const intent: Intent = { type: "save", value: "Alpha" };

    act(() => {
      result.current.dispatch(intent, () => ({ ok: true }), "Saved");
    });

    expect(result.current.lastIntent).toEqual(intent);
    expect(result.current.lastResult).toEqual({ ok: true });
    expect(result.current.announcement).toBe("Saved");
  });

  it("preserves a failure code and lets the host project its message", () => {
    const { result } = renderHook(() => useDemoObservation<Intent>("Ready"));
    const intent: Intent = { type: "save", value: "" };

    act(() => {
      result.current.dispatch(
        intent,
        () => ({ ok: false, code: "value.empty" }),
        "Saved",
        (failure) => failure.ok ? "Saved" : `Rejected: ${failure.code}`,
      );
    });

    expect(result.current.lastIntent).toEqual(intent);
    expect(result.current.lastResult).toEqual({ ok: false, code: "value.empty" });
    expect(result.current.announcement).toBe("Rejected: value.empty");
  });

  it("runs non-intent actions without replacing the observed intent", () => {
    const { result } = renderHook(() => useDemoObservation<Intent>("Ready"));

    act(() => {
      result.current.run(() => ({ ok: true }), "Undone", "Undo unavailable");
    });

    expect(result.current.lastIntent).toBeNull();
    expect(result.current.lastResult).toBeNull();
    expect(result.current.announcement).toBe("Undone");
  });

  it("records a result without inventing an intent", () => {
    const { result } = renderHook(() => useDemoObservation<Intent>("Ready"));

    act(() => {
      result.current.observeResult({ ok: false, code: "selection.empty" });
    });

    expect(result.current.lastIntent).toBeNull();
    expect(result.current.lastResult).toEqual({ ok: false, code: "selection.empty" });
  });
});
