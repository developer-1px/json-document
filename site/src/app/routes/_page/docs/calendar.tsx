import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/calendar")({
  component: function CalendarDocsRoute() {
    return <DocsRoute pageId="calendar" />;
  },
});
