import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/api/calendar-document")({
  component: function PackageApiReferenceRoute() {
    return <DocsRoute pageId="calendarDocumentApi" />;
  },
});
