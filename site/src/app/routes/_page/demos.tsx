import { Navigate, createFileRoute } from "@tanstack/react-router";
import { legacyPageRedirects } from "../../page-descriptors";

export const Route = createFileRoute("/_page/demos")({
  component: () => <Navigate to={legacyPageRedirects.showcase.to} />,
});
