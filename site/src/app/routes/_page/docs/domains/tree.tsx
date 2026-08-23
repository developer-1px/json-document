import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/domains/tree")({
  component: () => <DocsRoute pageId="domainTree" />,
});
