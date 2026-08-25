import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/api/rich-text-mention-react")({
  component: function PackageApiReferenceRoute() {
    return <DocsRoute pageId="richTextMentionReactApi" />;
  },
});
