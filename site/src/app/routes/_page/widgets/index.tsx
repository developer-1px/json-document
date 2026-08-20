import { Navigate, createFileRoute } from "@tanstack/react-router";
import { legacyPageRedirects } from "../../../page-descriptors";

export const Route = createFileRoute("/_page/widgets/")({
  component: () => <Navigate to={legacyPageRedirects.widgetsCatalog.to} />,
});
