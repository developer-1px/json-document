import { createFileRoute } from "@tanstack/react-router";
import { HowWeBuildRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/how-we-build")({
  component: HowWeBuildRoute,
});
