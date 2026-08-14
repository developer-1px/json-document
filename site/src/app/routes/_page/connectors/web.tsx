import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_page/connectors/web")({
  component: () => <Navigate to="/adapters" />,
});
