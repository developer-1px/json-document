import { createContext, useContext, type ReactNode } from "react";
import { PageFrame } from "../ui/primitives";
import { DemoSurface } from "./DemoSurface";

export function DemoPage(props: {
  readonly documentation: ReactNode;
  readonly children: ReactNode;
}) {
  const embedded = useContext(DemoEmbedContext);
  if (embedded) return <DemoSurface><div data-live-demo-surface>{props.children}</div></DemoSurface>;

  return (
    <PageFrame>
      {props.documentation}
      <DemoSurface>{props.children}</DemoSurface>
    </PageFrame>
  );
}

const DemoEmbedContext = createContext(false);

export function useDemoEmbed(): boolean {
  return useContext(DemoEmbedContext);
}

export function DemoEmbedProvider(props: { readonly children: ReactNode }) {
  return <DemoEmbedContext value>{props.children}</DemoEmbedContext>;
}
