import { createFileRoute } from "@tanstack/react-router";
import { ArtifactViewerRoute } from "../../../routes/artifact-viewer/ArtifactViewerRoute";

export const Route = createFileRoute("/_page/viewer")({
  component: ArtifactViewerRoute,
});
