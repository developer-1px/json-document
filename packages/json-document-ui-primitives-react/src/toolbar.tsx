import type { HTMLAttributes, ReactNode } from "react";

export type ToolbarRegionPlacement = "start" | "center" | "end";

export function Toolbar(props: Omit<HTMLAttributes<HTMLDivElement>, "aria-label"> & {
  readonly label: string;
}): ReactNode {
  const { label, ...toolbarProps } = props;
  return <div {...toolbarProps} role="toolbar" aria-label={label} data-ui-component="toolbar" />;
}

export function ToolbarGroup(props: Omit<HTMLAttributes<HTMLDivElement>, "aria-label"> & {
  readonly label?: string;
}): ReactNode {
  const { label, ...groupProps } = props;
  return (
    <div
      {...groupProps}
      role={label === undefined ? "presentation" : "group"}
      aria-label={label}
      data-ui-component="toolbar-group"
    />
  );
}

export function ToolbarLayout(props: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div {...props} data-ui-component="toolbar-layout" />;
}

export function ToolbarRegion(props: Omit<HTMLAttributes<HTMLDivElement>, "aria-label"> & {
  readonly label?: string;
  readonly placement: ToolbarRegionPlacement;
}): ReactNode {
  const { label, placement, ...regionProps } = props;
  return (
    <div
      {...regionProps}
      role={label === undefined ? "presentation" : "group"}
      aria-label={label}
      data-ui-component="toolbar-region"
      data-placement={placement}
    />
  );
}

export function ToolbarSeparator(props: HTMLAttributes<HTMLSpanElement>): ReactNode {
  return <span {...props} role="separator" aria-orientation="vertical" data-ui-component="toolbar-separator" />;
}

export function ToolbarSpacer(props: HTMLAttributes<HTMLSpanElement>): ReactNode {
  return <span {...props} aria-hidden="true" data-ui-component="toolbar-spacer" />;
}
