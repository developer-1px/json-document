import { useEffect, useState } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DemoWorkbench } from "../../shared/demo-workbench/DemoWorkbench";
import { loadDemoSources, type DemoSourceFile } from "../../shared/demo-workbench/demo-sources";
import { PageFrame, PageLeadProvider } from "../../shared/ui/primitives";
import { SiteBreadcrumb } from "../breadcrumb";
import { findSiteRoute, siteRoutes, usePathname } from "../router";

export const Route = createFileRoute("/_page")({
  component: InteriorPage,
});

function InteriorPage() {
  const route = findSiteRoute(usePathname());
  const loaded = useDemoSources(route.path);
  const sources = loaded?.path === route.path ? loaded.sources : undefined;
  const content = <Outlet />;
  return (
    <PageLeadProvider lead={<SiteBreadcrumb route={route} routes={siteRoutes} />}>
      <PageFrame>
        {sources === undefined ? content : (
          <DemoWorkbench sources={sources}>{content}</DemoWorkbench>
        )}
      </PageFrame>
    </PageLeadProvider>
  );
}

function useDemoSources(path: string) {
  const [loaded, setLoaded] = useState<{
    readonly path: string;
    readonly sources: ReadonlyArray<DemoSourceFile>;
  }>();
  useEffect(() => {
    let current = true;
    void loadDemoSources(path).then((sources) => {
      if (current && sources !== undefined) setLoaded({ path, sources });
    });
    return () => { current = false; };
  }, [path]);
  return loaded;
}
