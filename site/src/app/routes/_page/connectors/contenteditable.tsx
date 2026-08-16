import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_page/connectors/contenteditable")({
  component: () => <Navigate to="/adapters/contenteditable" />,
});
