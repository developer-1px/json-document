import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/order")({
  component: function OrderDocsRoute() {
    return <DocsRoute pageId="order" />;
  },
});
