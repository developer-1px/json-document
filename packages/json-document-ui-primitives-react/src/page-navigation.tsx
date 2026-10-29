import {useId, type AnchorHTMLAttributes, type ReactNode} from "react";
import {ChevronRight} from "lucide-react";
import {DisclosureButton} from "./controls.js";
import {contentPresentation} from "./content-presentation.js";

/** Native and router links share presentation without changing navigation semantics. */
export const linkPresentation = {
  inline: "json-document-link",
  action: "json-document-link json-document-link-action",
} as const;

export interface PageHeaderProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly identifier?: ReactNode;
  readonly status?: ReactNode;
  readonly actions?: ReactNode;
  readonly artwork?: ReactNode;
  readonly level?: 1 | 2;
  readonly titleRole?: "primary" | "section";
}

/** Identity, description, actions and optional artwork have one shared anatomy. */
export function PageHeader({title, description, identifier, status, actions, artwork, level = 1, titleRole = "section"}: PageHeaderProps): ReactNode {
  const Heading = level === 1 ? "h1" : "h2";
  return <header data-ui-component="page-header" data-page-artwork={artwork ? "true" : undefined}>
    <div data-page-region="identity">
      {identifier != null && <span className={contentPresentation.caption}>{identifier}</span>}
      <div data-page-region="title"><Heading className={titleRole === "primary" ? contentPresentation.title : contentPresentation.heading}>{title}</Heading>{status}</div>
      {description != null && <p className={contentPresentation.caption}>{description}</p>}
      {artwork && <figure data-page-region="artwork" aria-hidden="true">{artwork}</figure>}
    </div>
    {actions && <div data-page-region="actions">{actions}</div>}
  </header>;
}

export interface NavigationItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly href: string;
  readonly count?: number;
  readonly icon?: ReactNode;
  readonly children?: readonly NavigationItem[];
}
export interface NavigationGroup {
  readonly id: string;
  readonly label?: ReactNode;
  readonly icon?: ReactNode;
  readonly items: readonly NavigationItem[];
  readonly expanded?: boolean;
  readonly onExpandedChange?: (expanded: boolean) => void;
}
export type NavigationLinkRenderer = (item: NavigationItem, attributes: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) => ReactNode;

export function SidebarNavigation({label, groups, currentId, onNavigate, renderLink, collapsed = false}: {
  readonly label: string;
  readonly groups: readonly NavigationGroup[];
  readonly currentId?: string | undefined;
  readonly onNavigate?: (id: string) => void;
  readonly renderLink?: NavigationLinkRenderer;
  readonly collapsed?: boolean;
}): ReactNode {
  const id = useId();
  const containsCurrent = (items: readonly NavigationItem[]): boolean => items.some(item => item.id === currentId || containsCurrent(item.children ?? []));
  const renderItems = (items: readonly NavigationItem[]): ReactNode => <ul>{items.map(item => {
    const current = item.id === currentId;
    const attributes: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> = {
      "aria-current": current ? "page" : undefined,
      onClick: onNavigate ? event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigate(item.id);
      } : undefined,
      children: <>{item.icon && <span data-navigation-region="icon" aria-hidden="true">{item.icon}</span>}<span data-navigation-region="label">{item.label}</span>{item.count !== undefined && <span className={contentPresentation.caption}>{item.count}</span>}</>,
    };
    return <li key={item.id} data-navigation-branch={containsCurrent(item.children ?? []) ? "true" : undefined}>
      {renderLink ? renderLink(item, attributes) : <a href={item.href} {...attributes} />}
      {item.children?.length ? renderItems(item.children) : null}
    </li>;
  })}</ul>;
  return <nav aria-label={label} data-ui-component="sidebar-navigation" data-navigation-collapsed={collapsed || undefined}>{groups.map((group, index) => {
    const panelId = `${id}-group-${index}`;
    const collapsible = group.onExpandedChange !== undefined;
    const heading = <>{group.icon && <span data-navigation-region="icon" aria-hidden="true">{group.icon}</span>}<span>{group.label}</span></>;
    return <div key={group.id} role="group" aria-label={typeof group.label === "string" ? group.label : undefined} data-navigation-region="group">
      {group.label && (collapsible ? <DisclosureButton expanded={group.expanded ?? true} controls={panelId} onClick={() => group.onExpandedChange?.(!(group.expanded ?? true))}>{heading}</DisclosureButton> : <div data-navigation-region="heading" className={contentPresentation.caption}>{heading}</div>)}
      <div id={panelId} hidden={collapsible && group.expanded === false}>{renderItems(group.items)}</div>
    </div>;
  })}</nav>;
}

export interface BreadcrumbItem { readonly id: string; readonly label: ReactNode; readonly href: string; }
export function Breadcrumbs({label = "Breadcrumb", items, renderLink}: {
  readonly label?: string;
  readonly items: readonly BreadcrumbItem[];
  readonly renderLink?: NavigationLinkRenderer;
}): ReactNode {
  return <nav aria-label={label} data-ui-component="breadcrumbs"><ol>{items.map((item, index) => <li key={item.id}>
    {index > 0 && <ChevronRight size={12} aria-hidden="true" />}
    {index === items.length - 1 ? <span aria-current="page">{item.label}</span> : renderLink ? renderLink(item, {children: item.label}) : <a href={item.href} className={linkPresentation.inline}>{item.label}</a>}
  </li>)}</ol></nav>;
}
