import { type SiteNavigationGroup, type SiteRoute } from "./router";
import { ActionLink } from "../shared/ui/interactive";
import { ui } from "../shared/ui/styles";

export type BreadcrumbCrumb = {
  readonly path: string;
  readonly label: string;
};

const overview: BreadcrumbCrumb = { path: "/", label: "Overview" };

const groupLandings: Partial<Record<SiteNavigationGroup, BreadcrumbCrumb>> = {
  "JSON Document": { path: "/docs", label: "Why" },
  Demos: { path: "/demos", label: "Showcase" },
  Adapters: { path: "/adapters", label: "Adapters" },
  Connectors: { path: "/connectors", label: "Connectors" },
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

  const group = routeGroup(route, routes);
  const landing = group ? groupLandings[group] : undefined;
  if (landing && !stack.some((crumb) => crumb.path === landing.path)) {
    stack.unshift(landing);
  }
  if (stack[0]?.path !== overview.path) stack.unshift(overview);

  return stack;
}

function crumbLabel(route: SiteRoute): string {
  if (route.path === "/adapters") return "Adapters";
  if (route.path === "/connectors") return "Connectors";
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
            <li key={crumb.path} className={ui.breadcrumb.item}>
              {index > 0 ? <span className={ui.breadcrumb.sep} aria-hidden="true">›</span> : null}
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
