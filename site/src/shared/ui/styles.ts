// Site frame, demo frame and code viewer layout only.
// Control, content and surface appearance belongs to UI Primitives.
export const ui = {
  frame: {
    app: "bg-background-canvas font-sans text-foreground-default antialiased",
    page: "grid min-h-full content-start items-start justify-items-center bg-background-canvas px-layout-page pb-region pt-group lg:px-layout-page-wide",
    content: "grid w-full max-w-6xl content-start items-start gap-region",
    navigation: "bg-background-subtle text-sm",
    navigationRail: "flex h-screen w-12 shrink-0 flex-col items-center gap-related border-r border-line-subtle/40 py-related",
    brand: "font-mono text-foreground-strong no-underline hover:text-foreground-default",
  },
  demoWorkbench: {
    header: "sticky top-0 z-20 border-b border-line-subtle/40 bg-background-subtle px-related pt-related",
    tabList: "flex min-w-0 flex-1 flex-nowrap overflow-x-auto",
    tab: "shrink-0 whitespace-nowrap",
    panel: "min-w-0 bg-background-canvas",
  },
  code: {
    install: "min-w-0 self-start p-related",
    prompt: "text-foreground-accent",
  },

} as const;

export function classes(...values: ReadonlyArray<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
