import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/typeahead")({
  component: function AffordanceTypeaheadDocsRoute() {
    return <DocsRoute pageId="affordanceTypeahead" />;
  },
});
