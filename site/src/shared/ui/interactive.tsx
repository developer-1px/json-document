import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { classes, ui } from "./styles";

export type ActionButtonKind = "primary" | "secondary" | "danger";

export function ActionButton(props: ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly kind?: ActionButtonKind;
}) {
  const { className, kind = "secondary", type = "button", ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      type={type}
      className={classes(ui.interactive.control, ui.interactive.action[kind], className)}
    />
  );
}

type ActionLinkBaseProps = {
  readonly children: ReactNode;
  readonly kind?: "prominent" | "quiet";
  readonly className?: string;
};

type ActionLinkProps = ActionLinkBaseProps & (
  | {
    readonly to: string;
    readonly href?: never;
    readonly activePath?: string;
    readonly branch?: boolean;
  }
  | ({
    readonly href: string;
    readonly to?: never;
    readonly activePath?: never;
    readonly branch?: never;
  } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href">)
);

export function ActionLink(props: ActionLinkProps) {
  const { children, className, kind = "quiet" } = props;
  const content = (
    <>
      {children}
      {kind === "prominent" ? <span aria-hidden="true">→</span> : null}
    </>
  );
  const linkClassName = classes(ui.interactive.link[kind], className);

  if (props.href !== undefined) {
    const {
      activePath: _activePath,
      branch: _branch,
      children: _children,
      className: _className,
      href,
      kind: _kind,
      to: _to,
      ...anchorProps
    } = props;
    return <a {...anchorProps} href={href} className={linkClassName}>{content}</a>;
  }

  return (
    <InternalActionLink
      to={props.to}
      activePath={props.activePath}
      branch={props.branch}
      className={linkClassName}
    >
      {content}
    </InternalActionLink>
  );
}

function InternalActionLink(props: {
  readonly to: string;
  readonly children: ReactNode;
  readonly className: string;
  readonly activePath?: string;
  readonly branch?: boolean;
}) {
  const pathname = useRouterState({
    select: (state) => normalizePath(state.location.pathname),
  });
  const active = normalizePath(props.activePath ?? pathname) === props.to;
  return (
    <Link
      to={props.to as never}
      className={props.className}
      aria-current={active ? "page" : undefined}
      data-branch={props.branch && !active ? "true" : undefined}
      preload="intent"
      activeOptions={{ exact: true }}
    >
      {props.children}
    </Link>
  );
}

export function ToggleButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> & {
  readonly pressed: boolean;
}) {
  const { className, pressed, type = "button", ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      type={type}
      aria-pressed={pressed}
      className={classes(ui.interactive.control, ui.interactive.toggle, className)}
    />
  );
}

export function DisclosureButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-expanded"> & {
  readonly expanded: boolean;
  readonly controls: string;
  readonly chevronClassName?: string;
}) {
  const { children, chevronClassName, className, controls, expanded, type = "button", ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      type={type}
      aria-controls={controls}
      aria-expanded={expanded}
      className={classes(ui.interactive.disclosure, className)}
    >
      <span>{children}</span>
      <span aria-hidden="true" className={classes(ui.interactive.chevron, chevronClassName)}>⌄</span>
    </button>
  );
}

type SelectableItemProps<T extends ElementType> = {
  readonly as?: T;
  readonly selected: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "data-selected">;

export function SelectableItem<T extends ElementType = "button">(props: SelectableItemProps<T>) {
  const { as, className, selected, ...itemProps } = props;
  const Component = as ?? "button";
  return (
    <Component
      {...itemProps}
      data-selected={selected ? "true" : "false"}
      className={classes(ui.interactive.selectable, className)}
    />
  );
}

export function IconButton(props: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & {
  readonly label: string;
}) {
  const { className, label, type = "button", ...buttonProps } = props;
  return (
    <button
      {...buttonProps}
      type={type}
      aria-label={label}
      title={label}
      className={classes(ui.interactive.icon, className)}
    />
  );
}

function normalizePath(path: string): string {
  if (path === "/") return path;
  return path.replace(/\/+$/g, "") || "/";
}
