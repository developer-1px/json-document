import type { HTMLAttributes, ReactNode } from "react";
import { Toolbar } from "./toolbar.js";

export function ProductShell(props: HTMLAttributes<HTMLDivElement> & {
  readonly toolbar?: ReactNode;
  readonly toolbarLabel?: string;
  readonly toolbarPresentation?: "attached" | "floating";
  readonly inspector?: ReactNode;
  readonly canvasClassName?: string;
  readonly fill?: boolean;
}): ReactNode {
  const {
    toolbar,
    toolbarLabel,
    toolbarPresentation = "attached",
    inspector,
    canvasClassName,
    fill = false,
    children,
    ...shellProps
  } = props;
  return (
    <div {...shellProps} data-ui-component="product-shell" data-fill={fill ? "true" : "false"}>
      {toolbar == null ? null : (
        <Toolbar
          label={toolbarLabel ?? "Product actions"}
          data-ui-toolbar="product"
          data-ui-presentation={toolbarPresentation}
        >
          {toolbar}
        </Toolbar>
      )}
      <ProductCanvas className={canvasClassName} data-scroll={fill && canvasClassName === undefined ? "auto" : undefined}>{children}</ProductCanvas>
      {inspector == null ? null : <ProductInspector>{inspector}</ProductInspector>}
    </div>
  );
}

export function ProductCanvas(props: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div {...props} data-ui-component="product-canvas" />;
}

export function ProductInspector(props: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div {...props} data-ui-component="product-inspector" />;
}
