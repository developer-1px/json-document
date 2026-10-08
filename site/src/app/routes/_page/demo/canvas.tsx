import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_page/demo/canvas")({
  component: () => <Navigate to="/applications/canvas" replace />,
});
