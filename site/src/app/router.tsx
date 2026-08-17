import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { pageDescriptors, type SiteRoute } from "./page-descriptors";

export { type SiteNavigationGroup, type SiteRoute } from "./page-descriptors";
export const siteRoutes = pageDescriptors;

const siteUrl = (import.meta.env.VITE_SITE_URL ?? "https://developer-1px.github.io/json-document").replace(/\/$/, "");

export const routerBasepath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export function findSiteRoute(pathname: string): SiteRoute {
  const path = normalizePath(pathname);
  return siteRoutes.find((route) => route.path === path) ?? siteRoutes[0]!;
}

export function usePathname(): string {
  return useRouterState({
    select: (state) => normalizePath(state.location.pathname),
  });
}

export function useRouteMetadata(route: SiteRoute): void {
  useEffect(() => {
    const url = route.path === "/" ? `${siteUrl}/` : `${siteUrl}${route.path}`;
    document.documentElement.lang = route.language ?? "en";
    document.title = route.title;
    setMetaContent('meta[name="description"]', "name", "description", route.description);
    setMetaContent('meta[property="og:title"]', "property", "og:title", route.title);
    setMetaContent('meta[property="og:description"]', "property", "og:description", route.description);
    setMetaContent('meta[property="og:url"]', "property", "og:url", url);
    setMetaContent('meta[name="twitter:title"]', "name", "twitter:title", route.title);
    setMetaContent('meta[name="twitter:description"]', "name", "twitter:description", route.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.append(canonical);
    }
    canonical.setAttribute("href", url);
  }, [route]);
}

export function normalizePath(path: string): string {
  if (path === "/") return path;
  return path.replace(/\/+$/g, "") || "/";
}

function setMetaContent(selector: string, attribute: "name" | "property", key: string, content: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.append(meta);
  }
  meta.setAttribute("content", content);
}
