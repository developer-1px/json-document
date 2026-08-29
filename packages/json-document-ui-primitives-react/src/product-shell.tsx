import type { HTMLAttributes, ReactNode } from "react";
import { Toolbar } from "./toolbar.js";

export function ProductShell(props: HTMLAttributes<HTMLDivElement> & {
  readonly toolbar?: ReactNode;
  readonly toolbarLabel?: string;
  readonly inspector?: ReactNode;
  readonly canvasClassName?: string;
  readonly fill?: boolean;
}): ReactNode {
  const {
    toolbar,
    toolbarLabel,
    inspector,
    canvasClassName,
    fill = false,
    children,
    ...shellProps
  } = props;
  return (
    <div {...shellProps} data-ui-component="product-shell" data-fill={fill ? "true" : "false"}>
      {toolbar == null ? null : <ProductToolbar label={toolbarLabel ?? "Product actions"}>{toolbar}</ProductToolbar>}
      <ProductCanvas className={canvasClassName} data-scroll={fill && canvasClassName === undefined ? "auto" : undefined}>{children}</ProductCanvas>
      {inspector == null ? null : <ProductInspector>{inspector}</ProductInspector>}
    </div>
  );
}

export function ProductToolbar(props: Omit<HTMLAttributes<HTMLDivElement>, "aria-label"> & {
  readonly label: string;
}): ReactNode {
  const { label, ...toolbarProps } = props;
  return <Toolbar {...toolbarProps} label={label} data-ui-toolbar="product" />;
}

export function ProductCanvas(props: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div {...props} data-ui-component="product-canvas" />;
}

export function ProductInspector(props: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div {...props} data-ui-component="product-inspector" />;
}
