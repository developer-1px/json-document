import { useEffect, useState } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { Command, Popover, SidebarNavigation, linkPresentation, floatingSurface, type NavigationItem, type NavigationGroup } from "@interactive-os/json-document-ui-primitives-react";
import { ActionLink } from "../../shared/ui/interactive";
import { JsonDocumentWordmark } from "../../shared/ui/brand";
import { classes, ui } from "../../shared/ui/styles";
import {
  findSiteRoute,
  isAppChrome,
  siteRoutes,
  usePathname,
  useRouteMetadata,
  type SiteRoute,
} from "../router";
import { rootNavRoutes, routeSection, visibleNavChildren } from "../breadcrumb";
import { siteSections } from "../site-layers";
import { NavigationLayerIcon } from "../navigation-layer-icon";
import { HomeRoute } from "../../routes/home/HomeRoute";

export const Route = createRootRoute({
  component: AppShell,
  notFoundComponent: HomeRoute,
});

function AppShell() {
  const pathname = usePathname();
  const route = findSiteRoute(pathname);
  const appChrome = isAppChrome(route);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const collapsed = appChrome && navCollapsed;
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);

  useRouteMetadata(route);
  const activeSection = routeSection(route, siteRoutes);
  const [openSections, setOpenSections] = useState<ReadonlySet<(typeof siteSections)[number]["id"]>>(
    () => new Set(activeSection ? [activeSection.id] : []),
  );

  useEffect(() => {
    if (!activeSection) return;
    setOpenSections((current) => current.has(activeSection.id) ? current : new Set([...current, activeSection.id]));
  }, [activeSection]);

  const navigationItem = (item: SiteRoute): NavigationItem => ({
    id: item.path,
    href: item.path,
    label: item.label,
    children: visibleNavChildren(item.path, route.path, siteRoutes).map(navigationItem),
  });
  const navigationGroups: NavigationGroup[] = [
    {id: "root", items: rootNavRoutes(siteRoutes).map(navigationItem)},
    ...siteSections.flatMap(section => {
      const sectionRoutes = siteRoutes.filter(item => item.navigationGroup !== undefined && section.groups.includes(item.navigationGroup) && item.sidebar !== false);
      if (!sectionRoutes.length) return [];
      const landing = siteRoutes.find(item => item.path === section.path && item.navigationGroup === undefined);
      return [{
        id: section.id,
        label: section.label,
        icon: <NavigationLayerIcon section={section.id} />,
        expanded: openSections.has(section.id),
        onExpandedChange: (open: boolean) => setOpenSections(current => {
          const next = new Set(current);
          if (open) next.add(section.id); else next.delete(section.id);
          return next;
        }),
        items: [
          ...(landing ? [navigationItem(landing)] : []),
          ...section.groups.flatMap(group => sectionRoutes.filter(item => {
            if (item.navigationGroup !== group) return false;
            const parent = siteRoutes.find(candidate => candidate.path === item.parentPath);
            return parent?.navigationGroup !== group;
          }).map(navigationItem)),
        ],
      }];
    }),
  ].filter(group => group.items.length > 0);

  const navigation = (floating = false) => (
      <nav
        aria-label="Site navigation"
        className={classes(route.chrome === "none" ? "w-64 max-w-[calc(100vw-2rem)]" : "shrink-0 md:sticky md:top-0 md:h-screen md:w-52 md:self-start md:overflow-y-auto", !floating && route.chrome !== "none" && ui.frame.navigation)}
      >
        <div className="flex items-start justify-between gap-related">
          <ActionLink to="/" className={classes("flex min-w-0 flex-1 px-group py-related", ui.frame.brand)}>
            <span className="sr-only">json-document</span>
            <JsonDocumentWordmark className="h-auto w-full max-w-40" />
          </ActionLink>
          {appChrome ? (
            <Command label="Collapse navigation" rootClassName="p-related" onClick={() => setNavCollapsed(true)}>
              <PanelLeftClose aria-hidden="true" size={16} />
            </Command>
          ) : null}
        </div>
        <div className="px-related pb-related">
          <SidebarNavigation label="페이지" currentId={route.path}
            groups={navigationGroups}
            renderLink={(item, attributes) => <ActionLink {...attributes} to={item.href} activePath={route.path}>{attributes.children}</ActionLink>}
          />
        </div>
      </nav>
  );

  if (route.chrome === "none") return <>
    <Outlet />
    <Popover label="사이트 메뉴" trigger={<PanelLeft aria-hidden="true" size={16} />}
      triggerPresentation="icon" open={menuOpen} onOpenChange={setMenuOpen}
      className={classes(floatingSurface.control, "fixed left-4 top-4 z-40 p-1")}
      panelClassName={classes(floatingSurface.panel, "absolute left-0 top-[calc(100%+var(--space-related))] max-h-[calc(100dvh-5rem)] overflow-y-auto")}>
      {navigation(true)}
    </Popover>
  </>;

  return (
    <div className={classes("flex min-h-screen flex-col md:flex-row", appChrome && "h-screen overflow-hidden", ui.frame.app)}>
      <a
        href="#main-content"
        className={classes(linkPresentation.action, ui.frame.skipLink)}
      >
        Skip to content
      </a>
      <div className="flex shrink-0 items-center gap-related px-group py-related md:hidden">
        <Popover label="사이트 메뉴" trigger={<PanelLeft aria-hidden="true" size={16} />}
          triggerPresentation="icon" open={menuOpen} onOpenChange={setMenuOpen}
          panelClassName="absolute left-0 top-[calc(100%+var(--space-related))] z-50 max-h-[calc(100dvh-5rem)] w-[min(20rem,calc(100vw-2rem))] overflow-auto p-related">
          {navigation(true)}
        </Popover>
        <ActionLink to="/" className={classes("min-w-0 flex-1", ui.frame.brand)}>
          <span className="sr-only">json-document</span><JsonDocumentWordmark className="h-auto w-40 max-w-full" />
        </ActionLink>
      </div>
      <div className="hidden md:contents">
      {collapsed ? (
        <nav aria-label="Site navigation" className={classes(ui.frame.navigationRail, ui.frame.navigation)}>
          <Command label="Open navigation" onClick={() => setNavCollapsed(false)}>
            <PanelLeft aria-hidden="true" size={16} />
          </Command>
          <SidebarNavigation label="사이트 섹션" collapsed currentId={activeSection?.id}
            groups={[{id: "sections", items: siteSections.map(section => ({id: section.id, href: section.path, label: section.label, icon: <NavigationLayerIcon section={section.id} />}))}]}
            renderLink={(item, attributes) => <ActionLink {...attributes} to={item.href}>{attributes.children}</ActionLink>}
          />
        </nav>
      ) : (
      navigation()
      )}
      </div>
      <div id="main-content" className={classes("min-w-0 flex-1", appChrome && "flex min-h-0 flex-col overflow-hidden")}>
        <Outlet />
      </div>
    </div>
  );
}

