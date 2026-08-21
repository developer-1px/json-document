import { createContext, useContext, type ReactNode } from "react";
import { DemoWorkbench } from "./DemoWorkbench";
import type { DemoSourceFile } from "./demo-sources";

const DemoSourcesContext = createContext<ReadonlyArray<DemoSourceFile> | undefined>(undefined);

export function DemoSourcesProvider(props: {
  readonly sources: ReadonlyArray<DemoSourceFile> | undefined;
  readonly children: ReactNode;
}) {
  return <DemoSourcesContext value={props.sources}>{props.children}</DemoSourcesContext>;
}

export function DemoSurface(props: { readonly children: ReactNode }) {
  const sources = useContext(DemoSourcesContext);

  if (sources === undefined) {
    return props.children;
  }

  return <DemoWorkbench sources={sources}>{props.children}</DemoWorkbench>;
}
