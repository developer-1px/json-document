import type { ComponentType } from "react";

export type DemoDefinition = {
  readonly source: string;
};

export function defineDemo<TComponent extends ComponentType>(options: {
  readonly component: TComponent;
  readonly source: string;
}) {
  return {
    component: options.component,
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
