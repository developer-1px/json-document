import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/rename")({
  component: function AffordanceRenameDocsRoute() {
    return <DocsRoute pageId="affordanceRename" />;
  },
});
