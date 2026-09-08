import { act, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useAnchoredFloatingPosition } from "../src/index.js";

describe("useAnchoredFloatingPosition", () => {
  test("positions mounted floating content beside its anchor", () => {
    render(<Fixture anchor={{ x: 300, y: 200, width: 80, height: 30 }} />);
    const floating = screen.getByTestId("floating");
    expect(floating.style.position).toBe("fixed");
    expect(floating.style.left).toBe("388px");
    expect(floating.style.top).toBe("125px");
    expect(floating.dataset.placement).toBe("right");
  });

  test("removes positioning when the binding becomes inactive", () => {
    const rendered = render(<Fixture anchor={{ x: 300, y: 200, width: 80, height: 30 }} />);
    const floating = rendered.container.querySelector<HTMLElement>("[data-testid=\"floating\"]");
    expect(floating?.style.visibility).not.toBe("hidden");
    act(() => rendered.rerender(<Fixture anchor={{ x: 300, y: 200, width: 80, height: 30 }} active={false} />));
    expect(floating?.style.visibility).toBe("hidden");
  });
});

function Fixture(props: { readonly anchor: { x: number; y: number; width: number; height: number }; readonly active?: boolean }) {
  const binding = useAnchoredFloatingPosition<HTMLButtonElement, HTMLDivElement>({
    active: props.active ?? true,
    policy: { type: "preferred", placement: "right", fallbacks: ["left"] },
    offset: 8,
  });
  return (
    <>
      <button ref={(element) => {
        if (element !== null) element.getBoundingClientRect = () => domRect(props.anchor);
        binding.anchorRef(element);
      }}>Anchor</button>
      <div
        ref={(element) => {
          if (element !== null) element.getBoundingClientRect = () => domRect({ x: 0, y: 0, width: 200, height: 180 });
          binding.floatingRef(element);
        }}
        style={binding.style}
        data-testid="floating"
        data-placement={binding.position?.placement}
      />
    </>
  );
}

function domRect(rect: { x: number; y: number; width: number; height: number }): DOMRect {
  return { ...rect, left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height, toJSON: () => ({}) };
}
