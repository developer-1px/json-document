import { linkPresentation } from "@interactive-os/json-document-ui-primitives-react";
import {
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { ArrowRight } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { normalizePath } from "../../app/router";
import { classes } from "./styles";

type ActionLinkBaseProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children" | "className"> & {
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
  const { children, className, kind = "quiet", to, href, activePath, branch, ...attributes } = props;
  const content = <>{children}{kind === "prominent" ? <ArrowRight aria-hidden="true" size={16} /> : null}</>;
  const linkClassName = classes(kind === "prominent" ? linkPresentation.action : linkPresentation.inline, className);
  if (to !== undefined) return <InternalActionLink {...attributes} to={to} activePath={activePath} branch={branch} className={linkClassName}>{content}</InternalActionLink>;
  return <a {...attributes} href={href} className={linkClassName}>{content}</a>;
}

function InternalActionLink(props: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children" | "className"> & {
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
  const {to, children, className, activePath, branch, ...attributes} = props;
  return (
    <Link
      {...attributes}
      to={to as never}
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

