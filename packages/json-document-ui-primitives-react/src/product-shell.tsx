import {useEffect, useRef, type HTMLAttributes, type ReactNode} from "react";
import { floatingSurface } from "./floating-surface.js";
import {Command} from "./controls.js";
import {contentPresentation} from "./content-presentation.js";
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
          className={toolbarPresentation === "floating" ? floatingSurface.control : undefined}
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

export function ProductInspector(props: HTMLAttributes<HTMLElement> & {
  readonly heading?: ReactNode;
  readonly footer?: ReactNode;
  readonly presentation?: "attached" | "floating";
  readonly open?: boolean;
  readonly onClose?: () => void;
  readonly closeLabel?: string;
}): ReactNode {
  const {heading, footer, presentation = "attached", open = true, onClose, closeLabel = "닫기", children, className, ...attributes} = props;
  const panel = useRef<HTMLElement>(null);
  const isDialog = attributes.role === "dialog";
  useEffect(() => {
    if (!open || !isDialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (panel.current?.querySelector<HTMLElement>("button, input, textarea, select, [tabindex]") ?? panel.current)?.focus({preventScroll: true});
    return () => {if (previous?.isConnected) previous.focus({preventScroll: true});};
  }, [open, isDialog]);
  if (!open) return null;
  return <aside {...attributes} ref={panel} tabIndex={attributes.tabIndex ?? (isDialog ? -1 : undefined)} onKeyDown={event => {attributes.onKeyDown?.(event); if (event.key === "Escape" && !event.defaultPrevented && onClose) {event.preventDefault(); event.stopPropagation(); onClose();}}} className={[className, presentation === "floating" ? floatingSurface.panel : undefined].filter(Boolean).join(" ")} data-ui-component="product-inspector" data-inspector-presentation={presentation}>
    {(heading || onClose) && <header data-inspector-region="header"><span className={contentPresentation.heading}>{heading}</span>{onClose && <Command onClick={onClose}>{closeLabel}</Command>}</header>}
    <div data-inspector-region="body">{children}</div>
    {footer && <footer data-inspector-region="footer">{footer}</footer>}
  </aside>;
}
