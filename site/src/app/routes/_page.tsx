import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DemoWorkbench } from "../../shared/demo-workbench/DemoWorkbench";
import { demoSources } from "../../shared/demo-workbench/demo-sources";
import { PageFrame, PageLeadProvider } from "../../shared/ui/primitives";
import { SiteBreadcrumb } from "../breadcrumb";
import { findSiteRoute, siteRoutes, usePathname } from "../router";

export const Route = createFileRoute("/_page")({
  component: InteriorPage,
});

function InteriorPage() {
  const route = findSiteRoute(usePathname());
  const sources = demoSources(route.path);
  const content = <Outlet />;
  if (sources !== undefined) {
    return (
      <PageFrame>
        <SiteBreadcrumb route={route} routes={siteRoutes} />
        <DemoWorkbench sources={sources}>{content}</DemoWorkbench>
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
