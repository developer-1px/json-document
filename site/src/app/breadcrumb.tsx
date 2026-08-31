import { type SiteNavigationGroup, type SiteRoute } from "./router";
import { ChevronRight } from "lucide-react";
import { sectionForGroup, siteSections, type SiteSection } from "./site-layers";
import { ActionLink } from "../shared/ui/interactive";
import { ui } from "../shared/ui/styles";

export type BreadcrumbCrumb = {
  readonly path: string;
  readonly label: string;
};

const overview: BreadcrumbCrumb = { path: "/", label: "Overview" };

const groupLandings: Record<SiteNavigationGroup, BreadcrumbCrumb> = {
  "JSON Document": { path: "/docs", label: "JSON Document" },
  "Document Types": { path: "/docs/document-types", label: "Document Types" },
  Editing: { path: "/docs/intent-guide", label: "Editing" },
  Collaboration: { path: "/docs/collaboration", label: "Collaboration" },
  Adapter: { path: "/docs/adapters", label: "Platform Adapters" },
  Connector: { path: "/docs/connectors", label: "Ecosystem Connectors" },
  Affordance: { path: "/docs/affordance", label: "Affordances" },
  "UI Primitives": { path: "/docs/ui-primitives", label: "UI Primitives" },
  Hands: { path: "/editors", label: "Hands" },
  Artifact: { path: "/viewer", label: "Artifact" },
  Applications: { path: "/applications", label: "Applications" },
};

export function breadcrumbTrail(
  route: SiteRoute,
  routes: ReadonlyArray<SiteRoute>,
): ReadonlyArray<BreadcrumbCrumb> {
  const stack: BreadcrumbCrumb[] = [];
  let current: SiteRoute | undefined = route;
  const seen = new Set<string>();

  while (current && !seen.has(current.path)) {
    seen.add(current.path);
    stack.unshift({ path: current.path, label: crumbLabel(current) });
    current = current.parentPath
      ? routes.find((candidate) => candidate.path === current?.parentPath)
      : undefined;
  }

  const directSection = siteSections.find((section) => section.path === route.path && section.groups.length === 0);
  const group = routeGroup(route, routes);
  if (directSection) {
    stack[0] = { path: directSection.path, label: directSection.label };
  } else if (group) {
    const section = sectionForGroup(group);
    const landing = groupLandings[group];
    if (stack[0]?.path === section.path) stack[0] = { path: section.path, label: section.label };
    else {
      if (landing.path !== section.path && stack[0]?.path !== landing.path) stack.unshift(landing);
      stack.unshift({ path: section.path, label: section.label });
    }
  }
  if (stack[0]?.path !== overview.path) stack.unshift(overview);

  return stack;
}

export function routeSection(route: SiteRoute, routes: ReadonlyArray<SiteRoute>): SiteSection | undefined {
  const direct = siteSections.find((section) => section.path === route.path);
  if (direct) return direct;
  const group = routeGroup(route, routes);
  return group ? sectionForGroup(group) : undefined;
}

function crumbLabel(route: SiteRoute): string {
  return route.label;
}

export function SiteBreadcrumb(props: {
  readonly route: SiteRoute;
  readonly routes: ReadonlyArray<SiteRoute>;
}) {
  if (props.route.path === "/") return null;
  const trail = breadcrumbTrail(props.route, props.routes);
  if (trail.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className={ui.breadcrumb.nav}>
      <ol className={ui.breadcrumb.list}>
        {trail.map((crumb, index) => {
          const current = index === trail.length - 1;
          return (
            <li key={`${crumb.path}:${crumb.label}`} className={ui.breadcrumb.item}>
              {index > 0 ? <ChevronRight className={ui.breadcrumb.sep} aria-hidden="true" size={12} /> : null}
              {current ? (
                <span className={ui.breadcrumb.current} aria-current="page">{crumb.label}</span>
              ) : (
                <ActionLink to={crumb.path} className={ui.breadcrumb.link}>{crumb.label}</ActionLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function routeGroup(
  route: SiteRoute,
  routes: ReadonlyArray<SiteRoute>,
): SiteNavigationGroup | undefined {
  let current: SiteRoute | undefined = route;
  while (current) {
    if (current.navigationGroup) return current.navigationGroup;
    current = current.parentPath
      ? routes.find((candidate) => candidate.path === current?.parentPath)
      : undefined;
  }
  return undefined;
}

export function rootNavRoutes(routes: ReadonlyArray<SiteRoute>): ReadonlyArray<SiteRoute> {
  return routes.filter((route) =>
    route.path !== "/"
    && route.navigationGroup === undefined
    && route.parentPath === undefined
    && route.sidebar !== false
  );
}

export function childRoutes(
  parentPath: string,
  routes: ReadonlyArray<SiteRoute>,
): ReadonlyArray<SiteRoute> {
  return routes.filter((route) => route.parentPath === parentPath);
}

export function isNavBranch(currentPath: string, parentPath: string, routes: ReadonlyArray<SiteRoute>): boolean {
  let current = routes.find((route) => route.path === currentPath);
  while (current?.parentPath) {
    if (current.parentPath === parentPath) return true;
    current = routes.find((route) => route.path === current?.parentPath);
  }
  return false;
}

export function isDemoRoute(route: SiteRoute): boolean {
  return route.path === "/demo" || route.path.startsWith("/demo/");
}

export function visibleNavChildren(
  parentPath: string,
  currentPath: string,
  routes: ReadonlyArray<SiteRoute>,
): ReadonlyArray<SiteRoute> {
  if (currentPath !== parentPath && !isNavBranch(currentPath, parentPath, routes)) return [];
  const children = childRoutes(parentPath, routes).filter((route) => route.sidebar !== false);
  if (children.length === 1 && isDemoRoute(children[0]!)) return [];
  return children;
}
