// A2UI basic catalog layout: product structure only; component appearance belongs to UI Primitives.
export const basicSurfaceLayout = {
    root: "grid content-start items-start gap-related",
    column: "grid gap-related",
    row: "flex flex-wrap items-start gap-related",
    child: "contents",
    weightedChild: "block min-w-0 basis-0",
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      spaceBetween: "justify-between",
      spaceAround: "justify-around",
      spaceEvenly: "justify-evenly",
      stretch: "justify-stretch",
    },
    align: { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" },
    divider: {
      horizontal: " w-full border-0 border-t border-line-subtle/70",
      vertical: " min-h-6 w-0 self-stretch border-0 border-l border-line-subtle/70",
    },
    text: "m-0 tracking-tight",
  } as const;
