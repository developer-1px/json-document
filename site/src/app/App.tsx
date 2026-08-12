import { lazy, Suspense, type ComponentType } from "react";
import siteRoutes from "../../site-routes.json";
import { classes, ui } from "../shared/ui/styles";
import { HomeRoute } from "../routes/home/HomeRoute";
import {
  NavLink,
  useRouteMetadata,
  usePathname,
  type SiteRoute,
  type SiteNavigationGroup,
} from "./router";

type Route = SiteRoute & { readonly Component: ComponentType };

const DocsOverviewRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.DocsOverviewRoute })));
const QuickstartRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.QuickstartRoute })));
const ConnectorDocsRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.ConnectorDocsRoute })));
const ApiReferenceRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.ApiReferenceRoute })));
const DocumentDemoRoute = lazy(() => import("../routes/document-demo/DocumentDemoRoute").then((module) => ({ default: module.DocumentDemoRoute })));
const SheetDemoRoute = lazy(() => import("../routes/sheet-demo/SheetDemoRoute").then((module) => ({ default: module.SheetDemoRoute })));
const SelectionLabRoute = lazy(() => import("../routes/selection-lab/SelectionLabRoute").then((module) => ({ default: module.SelectionLabRoute })));
const ConnectorCatalogRoute = lazy(() => import("../routes/connectors/ConnectorCatalogRoute").then((module) => ({ default: module.ConnectorCatalogRoute })));
const ReactConnectorDemoRoute = lazy(() => import("../routes/connectors/react/ReactConnectorDemoRoute").then((module) => ({ default: module.ReactConnectorDemoRoute })));
const ZodConnectorDemoRoute = lazy(() => import("../routes/connectors/zod/ZodConnectorDemoRoute").then((module) => ({ default: module.ZodConnectorDemoRoute })));
const TanStackTableConnectorDemoRoute = lazy(() => import("../routes/connectors/tanstack-table/TanStackTableConnectorDemoRoute").then((module) => ({ default: module.TanStackTableConnectorDemoRoute })));

const routeComponents: Record<string, ComponentType> = {
  "/": HomeRoute,
  "/docs": DocsOverviewRoute,
  "/docs/tutorial": QuickstartRoute,
  "/docs/connectors": ConnectorDocsRoute,
  "/docs/api": ApiReferenceRoute,
  "/demo": DocumentDemoRoute,
  "/demo/sheet": SheetDemoRoute,
  "/demo/selection": SelectionLabRoute,
  "/connectors": ConnectorCatalogRoute,
  "/connectors/react": ReactConnectorDemoRoute,
  "/connectors/zod": ZodConnectorDemoRoute,
  "/connectors/tanstack-table": TanStackTableConnectorDemoRoute,
};

const routes: Route[] = (siteRoutes as SiteRoute[]).map((route) => ({
  ...route,
  Component: requireRouteComponent(route.path),
}));

function requireRouteComponent(path: string): ComponentType {
  const Component = routeComponents[path];
  if (!Component) throw new Error(`Missing site route component for ${path}.`);
  return Component;
}

export function App() {
  const pathname = usePathname();
  const route = routes.find((candidate) => candidate.path === pathname) ?? routes[0]!;
  const Page = route.Component;
  const routeGroups: ReadonlyArray<SiteNavigationGroup> = ["Start", "Core", "Editing", "Connectors"];

  useRouteMetadata(route);

  return (
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
        <div className="flex gap-4 overflow-x-auto px-3 pb-3 md:grid md:gap-4 md:px-2">
          {routeGroups.map((group) => {
            const groupRoutes = routes.filter((item) => item.navigationGroup === group);
            if (groupRoutes.length === 0) return null;
            const groupLabelId = `site-navigation-${group.toLowerCase()}`;
            return (
              <div key={group} role="group" aria-labelledby={groupLabelId} className="grid shrink-0 content-start gap-1">
                <div id={groupLabelId} className={classes("flex px-2 py-1", ui.text.meta)}>
                  {group}
                </div>
                {groupRoutes.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    activePath={route.path}
                    className={classes("flex px-2 py-1 md:px-3", ui.text.meta, ui.state.current)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>
      </nav>
      <div id="main-content" className="min-w-0 flex-1">
        <Suspense fallback={<div aria-hidden="true" />}>
          <Page />
        </Suspense>
      </div>
    </div>
  );
}
