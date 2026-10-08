import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { useAnchoredFloatingPosition } from "../src/index.js";

afterEach(cleanup);

describe("useAnchoredFloatingPosition", () => {
  test("remeasures SVG transforms when geometry changes without a resize", () => {
    const view = render(<Fixture anchor={{ x: 300, y: 200, width: 80, height: 30 }} />);
    view.rerender(<Fixture anchor={{ x: 400, y: 250, width: 80, height: 30 }} />);
    expect(screen.getByTestId("floating").style.left).toBe("488px");
    expect(screen.getByTestId("floating").style.top).toBe("175px");
  });

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
  const binding = useAnchoredFloatingPosition<SVGRectElement, HTMLDivElement>({
    active: props.active ?? true,
    geometryKey: JSON.stringify(props.anchor),
    policy: { type: "preferred", placement: "right", fallbacks: ["left"] },
    offset: 8,
  });
  return (
    <>
      <svg><rect ref={(element) => {
        if (element !== null) element.getBoundingClientRect = () => domRect(props.anchor);
        binding.anchorRef(element);
      }} /></svg>
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
