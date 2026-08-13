import { createFileRoute } from "@tanstack/react-router";
import { ShowcaseRoute } from "../../../routes/showcase/ShowcaseRoute";

export const Route = createFileRoute("/_page/demos")({
  component: ShowcaseRoute,
});
