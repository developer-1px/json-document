import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { MarkdownCaretRoute } from "../../../../routes/markdown-caret/MarkdownCaretRoute";

export const Route = createFileRoute("/_page/demo/markdown-caret")({
  component: MarkdownCaretRoute,
  ...defineDemo({ source: "routes/markdown-caret/MarkdownCaretRoute.tsx" }),
});
