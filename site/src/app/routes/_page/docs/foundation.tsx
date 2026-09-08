import { createFileRoute } from "@tanstack/react-router";
import { FoundationRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/foundation")({
  component: FoundationRoute,
});
