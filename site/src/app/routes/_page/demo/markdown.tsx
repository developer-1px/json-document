import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { MarkdownDemoRoute } from "../../../../routes/markdown-demo/MarkdownDemoRoute";

export const Route = createFileRoute("/_page/demo/markdown")({
  component: MarkdownDemoRoute,
  ...defineDemo({ source: "routes/markdown-demo/MarkdownDemoRoute.tsx" }),
});
