import { useEffect, useState } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ActionLink, DisclosureButton } from "../../shared/ui/interactive";
import { classes, ui } from "../../shared/ui/styles";
import {
  findSiteRoute,
  siteRoutes,
  usePathname,
  useRouteMetadata,
  type SiteRoute,
} from "../router";
import { isNavBranch, rootNavRoutes, routeGroup, visibleNavChildren } from "../breadcrumb";
import { siteLayerGroups } from "../site-layers";
import { HomeRoute } from "../../routes/home/HomeRoute";

export const Route = createRootRoute({
  component: AppShell,
  notFoundComponent: HomeRoute,
});

function AppShell() {
  const pathname = usePathname();
  const route = findSiteRoute(pathname);

  useRouteMetadata(route);
  const activeGroup = routeGroup(route, siteRoutes);
  const [openGroups, setOpenGroups] = useState<ReadonlySet<(typeof siteLayerGroups)[number]>>(
    () => new Set(activeGroup ? [activeGroup] : []),
  );

  useEffect(() => {
    if (!activeGroup) return;
    setOpenGroups((current) => current.has(activeGroup) ? current : new Set([...current, activeGroup]));
  }, [activeGroup]);

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
        <ActionLink to="/" className={classes("flex px-4 py-3", ui.frame.brand)}>
          json-document
        </ActionLink>
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
          {siteLayerGroups.map((group) => {
            const groupRoutes = siteRoutes.filter((item) => item.navigationGroup === group);
            if (groupRoutes.length === 0) return null;
            const groupLabelId = `site-navigation-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            const open = openGroups.has(group);
            return (
              <div key={group} role="group" aria-label={group} className="grid content-start">
                <DisclosureButton
                  className={ui.nav.groupToggle}
                  expanded={open}
                  controls={`${groupLabelId}-list`}
                  chevronClassName={ui.nav.chevron}
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
                </DisclosureButton>
                <ul
                  id={`${groupLabelId}-list`}
                  className={ui.nav.panel}
                  data-open={open ? "true" : undefined}
                  hidden={!open}
                >
                  {open
                    ? groupRoutes.map((item) => (
                      <NavItem
                        key={item.path}
                        item={item}
                        currentPath={route.path}
                        routes={siteRoutes}
                        depth={0}
                      />
                    ))
                    : null}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>
      <div id="main-content" className="min-w-0 flex-1">
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
  return (
    <li className="grid content-start">
      <ActionLink
        to={props.item.path}
        activePath={props.currentPath}
        branch={isNavBranch(props.currentPath, props.item.path, props.routes)}
        className={classes(props.depth === 0 ? ui.nav.item : ui.nav.child, ui.nav.current)}
      >
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
