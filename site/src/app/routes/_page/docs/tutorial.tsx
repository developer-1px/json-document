import { Navigate, createFileRoute } from "@tanstack/react-router";
import { legacyPageRedirects } from "../../../page-descriptors";

export const Route = createFileRoute("/_page/docs/tutorial")({
  component: () => <Navigate to={legacyPageRedirects.tutorial.to} />,
});
