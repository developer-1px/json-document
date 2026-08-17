import { Navigate, createFileRoute } from "@tanstack/react-router";
import { legacyPageRedirects } from "../../../page-descriptors";

export const Route = createFileRoute("/_page/connectors/contenteditable")({
  component: () => <Navigate to={legacyPageRedirects.contenteditableConnector.to} />,
});
