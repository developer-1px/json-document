import type { ReactNode } from "react";
import { PageFrame } from "../ui/primitives";
import { DemoSurface } from "./DemoSurface";

export function DemoPage(props: {
  readonly documentation: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <PageFrame>
      {props.documentation}
      <DemoSurface>{props.children}</DemoSurface>
    </PageFrame>
  );
}
