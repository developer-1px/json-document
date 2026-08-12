export const ui = {
  frame: {
    app: "bg-white text-stone-900",
    page: "min-h-full bg-stone-50",
    plainPage: "min-h-full bg-white",
    content: "mx-auto max-w-6xl",
    header: "border-b border-stone-200",
    hero: "border-b border-stone-200 bg-white",
    navigation: "border-b border-stone-200 bg-white text-sm md:border-b-0 md:border-r",
    brand: "font-mono text-stone-950 no-underline hover:text-stone-600 md:border-b md:border-stone-200",
  },
  text: {
    eyebrow: "text-xs font-semibold uppercase tracking-wide text-stone-400",
    title: "text-3xl font-semibold text-stone-950",
    heading: "text-base font-semibold text-stone-950",
    body: "text-sm leading-6 text-stone-600",
    meta: "text-xs leading-5 text-stone-500",
    inverseMeta: "text-xs leading-5 text-stone-400",
  },
  surface: {
    default: "rounded border border-stone-200 bg-white",
    subtle: "rounded border border-stone-200 bg-stone-50",
    inverse: "rounded border border-stone-800 bg-stone-950 text-stone-100",
    tableHead: "border-b border-stone-200 text-stone-700",
    tableCell: "border-b border-stone-100 text-stone-600",
    table: "border-collapse text-left",
    divider: "border-t border-stone-800",
    sectionDivider: "border-t border-stone-200",
    navigationRule: "border-l border-transparent",
    toolbar: "rounded border border-stone-200 bg-white",
    separator: "bg-stone-200",
    gridHead: "border border-stone-200 bg-stone-100 text-stone-600",
    gridIndex: "border border-stone-200 bg-stone-50 text-stone-400",
    gridCell: "border border-stone-200",
    documentBlock: "rounded border border-stone-200 bg-white",
    documentIndex: "border-0 border-r border-stone-100 bg-stone-50 text-stone-400",
    empty: "rounded border border-dashed border-stone-300 text-stone-500",
  },
  action: {
    primary: "rounded bg-stone-950 px-3 py-2 text-xs font-medium text-white no-underline hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-35",
    secondary: "rounded border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 no-underline hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35",
    toggle: "rounded border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 aria-pressed:bg-stone-950 aria-pressed:text-white disabled:cursor-not-allowed disabled:opacity-35",
  },
  field: {
    control: "rounded border border-stone-300 bg-white px-3 py-2 text-sm leading-6 text-stone-900 outline-none focus:border-stone-900",
    seamless: "border-0 bg-transparent px-3 py-2 text-sm leading-6 text-stone-800 outline-none",
  },
  code: {
    inline: "rounded-sm bg-stone-100 px-1 py-0.5 font-mono text-[0.85em] text-stone-800",
    block: "rounded border border-stone-200 bg-stone-50 p-3 font-mono text-xs leading-5 text-stone-800",
    inverse: "rounded bg-stone-950 p-3 font-mono text-xs leading-5 text-stone-100",
    json: "rounded border border-stone-800 bg-stone-950 p-3 font-mono text-xs leading-5 text-stone-100",
  },
  state: {
    current: "border-b border-transparent text-stone-500 no-underline hover:text-stone-950 aria-[current=page]:border-stone-950 aria-[current=page]:font-medium aria-[current=page]:text-stone-950 md:border-b-0 md:border-l",
    selected: "data-[selected=true]:relative data-[selected=true]:border-stone-900 data-[selected=true]:bg-amber-50 data-[selected=true]:outline data-[selected=true]:outline-2 data-[selected=true]:-outline-offset-2 data-[selected=true]:outline-stone-900",
    focus: "outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
    skipLink: "rounded bg-stone-950 px-3 py-2 text-xs font-medium text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3",
    disabled: "disabled:cursor-not-allowed disabled:opacity-35",
  },
} as const;

export function classes(...values: ReadonlyArray<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
