import { Outlet, createFileRoute, useMatches } from "@tanstack/react-router";
import { DemoProvider } from "../../shared/demo-workbench/DemoSurface";
import type { DemoDefinition } from "../../shared/demo-workbench/define-demo";
import { PageFrame, PageLeadProvider } from "../../shared/ui/primitives";
import { SiteBreadcrumb } from "../breadcrumb";
import { findSiteRoute, isAppChrome, siteRoutes, usePathname } from "../router";

export const Route = createFileRoute("/_page")({
  component: InteriorPage,
});

function InteriorPage() {
  const route = findSiteRoute(usePathname());
  const demo = useMatches({
    select: (matches) => matches.reduce<DemoDefinition | undefined>(
      (active, match) => match.staticData.demo ?? active,
      undefined,
    ),
  });
  const content = <Outlet />;
  if (isAppChrome(route)) {
    return <main className="flex min-h-0 flex-1 flex-col">{content}</main>;
  }
  if (demo !== undefined) {
    return (
      <PageFrame>
        <SiteBreadcrumb route={route} routes={siteRoutes} />
        <DemoProvider demo={demo}>{content}</DemoProvider>
      </PageFrame>
    );
  }
  return (
    <PageLeadProvider lead={<SiteBreadcrumb route={route} routes={siteRoutes} />}>
      <PageFrame>
        {content}
      </PageFrame>
    </PageLeadProvider>
  );
}
