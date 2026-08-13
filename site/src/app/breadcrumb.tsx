import { NavLink, type SiteNavigationGroup, type SiteRoute } from "./router";
import { classes, ui } from "../shared/ui/styles";

const groupLandings: Partial<Record<SiteNavigationGroup, { readonly path: string; readonly label: string }>> = {
  Start: { path: "/", label: "Overview" },
  Core: { path: "/docs", label: "Why" },
  Connectors: { path: "/connectors", label: "Connectors" },
};

export type BreadcrumbCrumb = {
  readonly path: string;
  readonly label: string;
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
    stack.unshift({ path: current.path, label: current.label });
    current = current.parentPath
      ? routes.find((candidate) => candidate.path === current?.parentPath)
      : undefined;
  }

  const root = stack[0];
  const grouped = routes.find((candidate) => candidate.path === root?.path);
  const group = grouped?.navigationGroup ?? ancestorGroup(route, routes);
  if (group) {
    const landing = groupLandings[group];
    if (landing && landing.path !== root?.path) {
      stack.unshift(landing);
    }
  }

  return stack;
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
                <NavLink to={crumb.path} className={ui.breadcrumb.link}>{crumb.label}</NavLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ancestorGroup(
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
