import { useMemo } from "react";
import { RouterProvider, createBrowserHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { routerBasepath } from "./router";

export function createSiteRouter() {
  return createRouter({
    routeTree,
    history: createBrowserHistory(),
    basepath: routerBasepath,
    trailingSlash: "never",
    scrollRestoration: true,
    defaultPreload: "intent",
  });
}

export function App() {
  const router = useMemo(() => createSiteRouter(), []);
  return <RouterProvider router={router} />;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createSiteRouter>;
  }
}
