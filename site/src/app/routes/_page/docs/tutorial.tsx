import { createFileRoute } from "@tanstack/react-router";
import { QuickstartRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/tutorial")({
  component: QuickstartRoute,
});
