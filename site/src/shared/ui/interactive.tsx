import {
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { classes, ui } from "./styles";

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

function normalizePath(path: string): string {
  if (path === "/") return path;
  return path.replace(/\/+$/g, "") || "/";
}
