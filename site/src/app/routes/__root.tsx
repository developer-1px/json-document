import { useEffect, useState } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { DisclosureButton, Command } from "@interactive-os/json-document-ui-primitives-react";
import { ActionLink } from "../../shared/ui/interactive";
import { CatMenuMark, JsonDocumentWordmark } from "../../shared/ui/brand";
import { classes, ui } from "../../shared/ui/styles";
import {
  findSiteRoute,
  isAppChrome,
  siteRoutes,
  usePathname,
  useRouteMetadata,
  type SiteRoute,
} from "../router";
import { isNavBranch, rootNavRoutes, routeSection, visibleNavChildren } from "../breadcrumb";
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

  useRouteMetadata(route);
  const activeSection = routeSection(route, siteRoutes);
  const [openSections, setOpenSections] = useState<ReadonlySet<(typeof siteSections)[number]["id"]>>(
    () => new Set(activeSection ? [activeSection.id] : []),
  );

  useEffect(() => {
    if (!activeSection) return;
    setOpenSections((current) => current.has(activeSection.id) ? current : new Set([...current, activeSection.id]));
  }, [activeSection]);

  return (
    <div className={classes("flex min-h-screen flex-col md:flex-row", appChrome && "h-screen overflow-hidden", ui.frame.app)}>
      <a
        href="#main-content"
        className={classes("sr-only z-50", ui.state.skipLink)}
      >
        Skip to content
      </a>
      {collapsed ? (
        <nav aria-label="Site navigation" className={classes(ui.frame.navigationRail, ui.frame.navigation)}>
          <Command label="Open navigation" onClick={() => setNavCollapsed(false)}>
            <PanelLeft aria-hidden="true" size={16} />
          </Command>
          <div className={ui.nav.railMenu}>
            {siteSections.map((section) => (
              <ActionLink
                key={section.id}
                to={section.path}
                activePath={route.path}
                className={classes(ui.nav.railItem, section.separated ? ui.nav.railSeparatedItem : undefined, ui.nav.current)}
              >
                <span className="sr-only">{section.label}</span>
                <NavigationLayerIcon section={section.id} />
              </ActionLink>
            ))}
          </div>
        </nav>
      ) : (
      <nav
        aria-label="Site navigation"
        className={classes("shrink-0 md:sticky md:top-0 md:h-screen md:w-52 md:self-start md:overflow-y-auto", ui.frame.navigation)}
      >
        <div className="flex items-start justify-between gap-1">
          <ActionLink to="/" className={classes("flex min-w-0 flex-1 px-4 py-3", ui.frame.brand)}>
            <span className="sr-only">json-document</span>
            <JsonDocumentWordmark className="h-auto w-full max-w-40" />
          </ActionLink>
          {appChrome ? (
            <Command label="Collapse navigation" className="mt-2 mr-1" onClick={() => setNavCollapsed(true)}>
              <PanelLeftClose aria-hidden="true" size={16} />
            </Command>
          ) : null}
        </div>
        <div className={ui.nav.menu}>
          {rootNavRoutes(siteRoutes).map((item) => (
            <ActionLink
              key={item.path}
              to={item.path}
              activePath={route.path}
              className={classes(ui.nav.item, ui.nav.current)}
            >
              {item.label}
            </ActionLink>
          ))}
          {siteSections.map((section) => {
            const sectionRoutes = siteRoutes.filter((item) =>
              item.navigationGroup !== undefined
              && section.groups.includes(item.navigationGroup)
              && item.sidebar !== false
            );
            const sectionLabelId = `site-navigation-${section.id}`;
            const open = openSections.has(section.id);
            if (section.groups.length === 0) return (
              <ActionLink
                key={section.id}
                to={section.path}
                activePath={route.path}
                className={classes(ui.nav.item, section.separated ? ui.nav.separatedGroup : undefined, ui.nav.current)}
              >
                <NavigationLayerIcon section={section.id} className="shrink-0" />
                {section.label}
              </ActionLink>
            );
            if (sectionRoutes.length === 0) return null;
            return (
              <div
                key={section.id}
                role="group"
                aria-label={section.label}
                className={classes("grid content-start", section.separated ? ui.nav.separatedGroup : undefined)}
              >
                <DisclosureButton
                  className={classes(ui.nav.groupToggle, activeSection?.id === section.id ? ui.nav.groupActive : ui.nav.groupIdle)}
                  expanded={open}
                  controls={`${sectionLabelId}-list`}
                  onClick={() => {
                    setOpenSections((current) => {
                      const next = new Set(current);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    });
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <NavigationLayerIcon section={section.id} className="shrink-0" />
                    <span>{section.label}</span>
                  </span>
                  <span aria-hidden="true" className={classes(ui.interactive.chevron, ui.nav.chevron)}>⌄</span>
                </DisclosureButton>
                <ul
                  id={`${sectionLabelId}-list`}
                  className={ui.nav.panel}
                  data-open={open ? "true" : undefined}
                  hidden={!open}
                >
                  {open
                    ? section.groups.map((group) => {
                      const groupRoutes = sectionRoutes.filter((item) => {
                        if (item.navigationGroup !== group) return false;
                        const parent = item.parentPath
                          ? siteRoutes.find((candidate) => candidate.path === item.parentPath)
                          : undefined;
                        return parent?.navigationGroup !== group;
                      });
                      if (groupRoutes.length === 0) return null;
                      return (
                        <li key={group} className="grid content-start">
                          {section.groups.length > 1 ? <span className={classes("px-4 pt-3", ui.text.meta)}>{group}</span> : null}
                          <ul className={ui.nav.list}>
                            {groupRoutes.map((item) => (
                              <NavItem key={item.path} item={item} currentPath={route.path} routes={siteRoutes} depth={0} />
                            ))}
                          </ul>
                        </li>
                      );
                    })
                    : null}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>
      )}
      <div id="main-content" className={classes("min-w-0 flex-1", appChrome && "flex min-h-0 flex-col overflow-hidden")}>
        <Outlet />
      </div>
    </div>
  );
}

function NavItem(props: {
  readonly item: SiteRoute;
  readonly currentPath: string;
  readonly routes: ReadonlyArray<SiteRoute>;
  readonly depth: number;
}) {
  const children = visibleNavChildren(props.item.path, props.currentPath, props.routes);
  const current = props.currentPath === props.item.path;
  return (
    <li className="grid content-start">
      <ActionLink
        to={props.item.path}
        activePath={props.currentPath}
        branch={isNavBranch(props.currentPath, props.item.path, props.routes)}
        className={classes(props.depth === 0 ? ui.nav.item : ui.nav.child, ui.nav.current)}
      >
        <span className="grid size-4 shrink-0 place-items-center text-line-accent">{current ? <CatMenuMark /> : null}</span>
        {props.item.label}
      </ActionLink>
      {children.length > 0 ? (
        <ul className={ui.nav.list}>
          {children.map((child) => (
            <NavItem
              key={child.path}
              item={child}
              currentPath={props.currentPath}
              routes={props.routes}
              depth={props.depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
