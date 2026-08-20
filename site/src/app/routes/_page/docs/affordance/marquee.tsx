import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/marquee")({
  component: function AffordanceMarqueeDocsRoute() {
    return <DocsRoute pageId="affordanceMarquee" />;
  },
});
