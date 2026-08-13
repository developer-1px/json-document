import { useEffect, useState } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { classes, ui } from "../../shared/ui/styles";
import {
  NavLink,
  findSiteRoute,
  siteRoutes,
  usePathname,
  useRouteMetadata,
  type SiteNavigationGroup,
} from "../router";
import { childRoutes, isNavBranch, rootNavRoutes, routeGroup } from "../breadcrumb";
import { HomeRoute } from "../../routes/home/HomeRoute";

export const Route = createRootRoute({
  component: AppShell,
  notFoundComponent: HomeRoute,
});

function AppShell() {
  const pathname = usePathname();
  const route = findSiteRoute(pathname);
  const routeGroups: ReadonlyArray<SiteNavigationGroup> = ["JSON Document", "Editing", "Connectors", "Reference"];

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
          {rootNavRoutes(siteRoutes).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              activePath={route.path}
              className={classes(ui.nav.item, ui.nav.current)}
            >
              {item.label}
            </NavLink>
          ))}
          {routeGroups.map((group) => {
            const groupRoutes = siteRoutes.filter((item) => item.navigationGroup === group);
            if (groupRoutes.length === 0) return null;
            const groupLabelId = `site-navigation-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
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
        <Outlet />
      </div>
    </div>
  );
}
