import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Outlet,
  RouterProvider,
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  type RouteComponent,
} from "@tanstack/react-router";
import { classes, ui } from "../shared/ui/styles";
import { PageLeadProvider } from "../shared/ui/primitives";
import { HomeRoute } from "../routes/home/HomeRoute";
import {
  NavLink,
  findSiteRoute,
  routerBasepath,
  siteRoutes,
  usePathname,
  useRouteMetadata,
  type SiteNavigationGroup,
} from "./router";
import { SiteBreadcrumb, childRoutes, isNavBranch, routeGroup } from "./breadcrumb";

const DocsOverviewRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.DocsOverviewRoute })));
const QuickstartRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.QuickstartRoute })));
const ConnectorDocsRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.ConnectorDocsRoute })));
const ApiReferenceRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.ApiReferenceRoute })));
const DocumentDemoRoute = lazy(() => import("../routes/document-demo/DocumentDemoRoute").then((module) => ({ default: module.DocumentDemoRoute })));
const SheetDemoRoute = lazy(() => import("../routes/sheet-demo/SheetDemoRoute").then((module) => ({ default: module.SheetDemoRoute })));
const SelectionLabRoute = lazy(() => import("../routes/selection-lab/SelectionLabRoute").then((module) => ({ default: module.SelectionLabRoute })));
const DatabaseDemoRoute = lazy(() => import("../routes/database-demo/DatabaseDemoRoute").then((module) => ({ default: module.DatabaseDemoRoute })));
const ConnectorCatalogRoute = lazy(() => import("../routes/connectors/ConnectorCatalogRoute").then((module) => ({ default: module.ConnectorCatalogRoute })));
const ReactConnectorDemoRoute = lazy(() => import("../routes/connectors/react/ReactConnectorDemoRoute").then((module) => ({ default: module.ReactConnectorDemoRoute })));
const ReactHookFormConnectorDemoRoute = lazy(() => import("../routes/connectors/react-hook-form/ReactHookFormConnectorDemoRoute").then((module) => ({ default: module.ReactHookFormConnectorDemoRoute })));
const ZodConnectorDemoRoute = lazy(() => import("../routes/connectors/zod/ZodConnectorDemoRoute").then((module) => ({ default: module.ZodConnectorDemoRoute })));
const ZodValidateDemoRoute = lazy(() => import("../routes/connectors/zod/ZodValidateDemoRoute").then((module) => ({ default: module.ZodValidateDemoRoute })));
const TanStackTableConnectorDemoRoute = lazy(() => import("../routes/connectors/tanstack-table/TanStackTableConnectorDemoRoute").then((module) => ({ default: module.TanStackTableConnectorDemoRoute })));
const WebConnectorDemoRoute = lazy(() => import("../routes/connectors/web/WebConnectorDemoRoute").then((module) => ({ default: module.WebConnectorDemoRoute })));

const routeComponents: Record<string, RouteComponent> = {
  "/": HomeRoute,
  "/docs": DocsOverviewRoute,
  "/docs/tutorial": QuickstartRoute,
  "/docs/connectors": ConnectorDocsRoute,
  "/docs/api": ApiReferenceRoute,
  "/demo": DocumentDemoRoute,
  "/demo/sheet": SheetDemoRoute,
  "/demo/selection": SelectionLabRoute,
  "/demo/database": DatabaseDemoRoute,
  "/connectors": ConnectorCatalogRoute,
  "/connectors/react": ReactConnectorDemoRoute,
  "/connectors/react-hook-form": ReactHookFormConnectorDemoRoute,
  "/connectors/zod": ZodConnectorDemoRoute,
  "/connectors/zod/validate": ZodValidateDemoRoute,
  "/connectors/tanstack-table": TanStackTableConnectorDemoRoute,
  "/connectors/web": WebConnectorDemoRoute,
};

function requireRouteComponent(path: string): RouteComponent {
  const Component = routeComponents[path];
  if (!Component) throw new Error(`Missing site route component for ${path}.`);
  return Component;
}

function AppShell() {
  const pathname = usePathname();
  const route = findSiteRoute(pathname);
  const routeGroups: ReadonlyArray<SiteNavigationGroup> = ["Start", "Core", "Editing", "Connectors"];

  useRouteMetadata(route);
  const activeGroup = routeGroup(route, siteRoutes);
  const [openGroups, setOpenGroups] = useState<ReadonlySet<SiteNavigationGroup>>(
    () => new Set(activeGroup ? [activeGroup] : []),
  );

  useEffect(() => {
    if (!activeGroup) return;
    setOpenGroups((current) => current.has(activeGroup) ? current : new Set([...current, activeGroup]));
  }, [activeGroup]);

  return (
    <PageLeadProvider lead={<SiteBreadcrumb route={route} routes={siteRoutes} />}>
      <div className={classes("flex min-h-screen flex-col md:flex-row", ui.frame.app)}>
        <a
          href="#main-content"
          className={classes("sr-only z-50", ui.state.skipLink)}
        >
          Skip to content
        </a>
        <nav
          aria-label="Site navigation"
          className={classes("shrink-0 md:sticky md:top-0 md:h-screen md:w-52 md:self-start md:overflow-y-auto", ui.frame.navigation)}
        >
          <NavLink to="/" className={classes("flex px-4 py-3", ui.frame.brand)}>
            json-document
          </NavLink>
          <div className={ui.nav.menu}>
            {routeGroups.map((group) => {
              const groupRoutes = siteRoutes.filter((item) => item.navigationGroup === group);
              if (groupRoutes.length === 0) return null;
              const groupLabelId = `site-navigation-${group.toLowerCase()}`;
              const open = openGroups.has(group);
              return (
                <div key={group} role="group" aria-labelledby={groupLabelId} className="grid content-start">
                  <button
                    type="button"
                    id={groupLabelId}
                    className={ui.nav.group}
                    aria-expanded={open}
                    aria-controls={`${groupLabelId}-list`}
                    onClick={() => {
                      setOpenGroups((current) => {
                        const next = new Set(current);
                        if (next.has(group)) next.delete(group);
                        else next.add(group);
                        return next;
                      });
                    }}
                  >
                    {group}
                    <span className={ui.nav.chevron} aria-hidden="true">{open ? "−" : "+"}</span>
                  </button>
                  <ul id={`${groupLabelId}-list`} className={ui.nav.panel} data-open={open ? "true" : undefined}>
                    {groupRoutes.map((item) => {
                      const children = childRoutes(item.path, siteRoutes);
                      return (
                        <li key={item.path} className="grid content-start">
                          <NavLink
                            to={item.path}
                            activePath={route.path}
                            branch={isNavBranch(route.path, item.path, siteRoutes)}
                            className={classes(ui.nav.item, ui.nav.current)}
                          >
                            {item.label}
                          </NavLink>
                          {children.length > 0 ? (
                            <ul className={ui.nav.list}>
                              {children.map((child) => (
                                <li key={child.path}>
                                  <NavLink
                                    to={child.path}
                                    activePath={route.path}
                                    className={classes(ui.nav.child, ui.nav.current)}
                                  >
                                    {child.label}
                                  </NavLink>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>
        <div id="main-content" className="min-w-0 flex-1">
          <Suspense fallback={<div aria-hidden="true" />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </PageLeadProvider>
  );
}

export function createSiteRouter() {
  const rootRoute = createRootRoute({
    component: AppShell,
  });

  const children = siteRoutes.map((spec) =>
    createRoute({
      getParentRoute: () => rootRoute,
      ...(spec.path === "/"
        ? { path: "/" }
        : { path: spec.path.slice(1) }),
      component: requireRouteComponent(spec.path),
    }),
  );

  return createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createBrowserHistory(),
    basepath: routerBasepath,
    trailingSlash: "never",
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
    defaultNotFoundComponent: HomeRoute,
  });
}

export function App() {
  const router = useMemo(() => createSiteRouter(), []);
  return <RouterProvider router={router} />;
}
