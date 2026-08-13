import { useEffect, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

export type SiteNavigationGroup = "Start" | "Core" | "Editing" | "Connectors";

export type SiteRoute = {
  readonly path: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly navigationGroup?: SiteNavigationGroup;
  readonly parentPath?: string;
};

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const siteUrl = (import.meta.env.VITE_SITE_URL ?? "https://developer-1px.github.io/json-document").replace(/\/$/, "");

export function usePathname(): string {
  return useSyncExternalStore(subscribePathname, readPathname, () => "/");
}

export function useRouteMetadata(route: SiteRoute): void {
  useEffect(() => {
    const url = route.path === "/" ? `${siteUrl}/` : `${siteUrl}${route.path}`;
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

export function NavLink(props: {
  readonly to: string;
  readonly children: ReactNode;
  readonly className: string;
  readonly activePath?: string;
  readonly branch?: boolean;
}) {
  const active = props.activePath === props.to;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.altKey
      || event.ctrlKey
      || event.shiftKey
    ) return;

    event.preventDefault();
    if (!active) navigate(props.to);
  }

  return (
    <a
      href={pathWithBase(props.to)}
      className={props.className}
      aria-current={active ? "page" : undefined}
      data-branch={props.branch && !active ? "true" : undefined}
      onClick={handleClick}
    >
      {props.children}
    </a>
  );
}

function pathWithBase(path: string): string {
  return `${basePath}${path}` || "/";
}

function readPathname(): string {
  const pathname = window.location.pathname;
  const withoutBase = basePath !== "" && pathname.startsWith(`${basePath}/`)
    ? pathname.slice(basePath.length)
    : pathname === basePath ? "/" : pathname;
  return normalizePath(withoutBase || "/");
}

function subscribePathname(listener: () => void): () => void {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}

function navigate(path: string): void {
  window.history.pushState(null, "", pathWithBase(path));
  window.scrollTo({ left: 0, top: 0 });
  window.dispatchEvent(new Event("popstate"));
}

function normalizePath(path: string): string {
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
