import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/api/annotation")({
  component: function AnnotationApiReferenceRoute() {
    return <DocsRoute pageId="annotationApi" />;
  },
});
