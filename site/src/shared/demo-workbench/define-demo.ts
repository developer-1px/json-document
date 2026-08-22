export type DemoDefinition = {
  readonly source: string;
};

export function defineDemo(options: {
  readonly source: string;
}) {
  return {
    staticData: {
      demo: { source: options.source } satisfies DemoDefinition,
    },
  } as const;
}

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    readonly demo?: DemoDefinition;
  }
}
