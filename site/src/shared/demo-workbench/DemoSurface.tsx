import { createContext, useContext, type ReactNode } from "react";
import { DemoWorkbench } from "./DemoWorkbench";
import type { DemoDefinition } from "./define-demo";

const DemoContext = createContext<DemoDefinition | undefined>(undefined);

export function DemoProvider(props: {
  readonly demo: DemoDefinition | undefined;
  readonly children: ReactNode;
}) {
  return <DemoContext value={props.demo}>{props.children}</DemoContext>;
}

export function DemoSurface(props: { readonly children: ReactNode }) {
  const demo = useContext(DemoContext);

  if (demo === undefined) {
    return props.children;
  }

  return <DemoWorkbench source={demo.source}>{props.children}</DemoWorkbench>;
}
