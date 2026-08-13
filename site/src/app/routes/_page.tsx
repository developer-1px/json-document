import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PageFrame, PageLeadProvider } from "../../shared/ui/primitives";
import { SiteBreadcrumb } from "../breadcrumb";
import { findSiteRoute, siteRoutes, usePathname } from "../router";

export const Route = createFileRoute("/_page")({
  component: InteriorPage,
});

function InteriorPage() {
  const route = findSiteRoute(usePathname());
  return (
    <PageLeadProvider lead={<SiteBreadcrumb route={route} routes={siteRoutes} />}>
      <PageFrame>
        <Outlet />
      </PageFrame>
    </PageLeadProvider>
  );
}
