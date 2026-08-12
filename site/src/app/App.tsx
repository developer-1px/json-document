import { lazy, Suspense, type ComponentType } from "react";
import siteRoutes from "../../site-routes.json";
import { HomeRoute } from "../routes/home/HomeRoute";
import {
  NavLink,
  useRouteMetadata,
  usePathname,
  type SiteRoute,
} from "./router";

type Route = SiteRoute & { readonly Component: ComponentType };

const DocsOverviewRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.DocsOverviewRoute })));
const QuickstartRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.QuickstartRoute })));
const ConnectorDocsRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.ConnectorDocsRoute })));
const ApiReferenceRoute = lazy(() => import("../routes/docs/DocsRoute").then((module) => ({ default: module.ApiReferenceRoute })));
const DocumentDemoRoute = lazy(() => import("../routes/document-demo/DocumentDemoRoute").then((module) => ({ default: module.DocumentDemoRoute })));
const ConnectorCatalogRoute = lazy(() => import("../routes/connectors/ConnectorCatalogRoute").then((module) => ({ default: module.ConnectorCatalogRoute })));
const ReactConnectorDemoRoute = lazy(() => import("../routes/connectors/react/ReactConnectorDemoRoute").then((module) => ({ default: module.ReactConnectorDemoRoute })));

const routeComponents: Record<string, ComponentType> = {
  "/": HomeRoute,
  "/docs": DocsOverviewRoute,
  "/docs/tutorial": QuickstartRoute,
  "/docs/connectors": ConnectorDocsRoute,
  "/docs/api": ApiReferenceRoute,
  "/demo": DocumentDemoRoute,
  "/connectors": ConnectorCatalogRoute,
  "/connectors/react": ReactConnectorDemoRoute,
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
  const routeGroups = ["Start", "Connectors"] as const;

  useRouteMetadata(route);

  return (
    <div className="flex min-h-screen flex-col bg-white text-stone-900 md:flex-row">
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-stone-950 px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <nav
        aria-label="Site navigation"
        className="shrink-0 border-b border-stone-200 bg-white text-sm md:sticky md:top-0 md:h-screen md:w-52 md:self-start md:overflow-y-auto md:border-b-0 md:border-r"
      >
        <NavLink to="/" className="flex px-4 py-3 font-mono text-stone-950 no-underline hover:text-stone-600 md:border-b md:border-stone-200">
          json-document
        </NavLink>
        <div className="flex gap-4 overflow-x-auto px-3 pb-3 md:grid md:gap-4 md:px-2">
          {routeGroups.map((group) => {
            const groupRoutes = routes.filter((item) => item.group === group);
            if (groupRoutes.length === 0) return null;
            return (
              <div key={group} className="flex shrink-0 gap-1 md:grid">
                <div className="hidden border-0 bg-transparent px-2 py-1 text-[10px] font-medium text-stone-400 md:flex">
                  {group}
                </div>
                {groupRoutes.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    activePath={route.path}
                    className="flex border-b border-transparent px-2 py-1 text-stone-500 no-underline hover:text-stone-950 aria-[current=page]:border-stone-950 aria-[current=page]:font-medium aria-[current=page]:text-stone-950 md:border-b-0 md:border-l md:px-3"
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
