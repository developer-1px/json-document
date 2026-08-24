import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ComposerDemoRoute } from "../../../../routes/composer-demo/ComposerDemoRoute";

export const Route = createFileRoute("/_page/demo/composer")({
  component: ComposerDemoRoute,
  ...defineDemo({ source: "routes/composer-demo/ComposerDemoRoute.tsx" }),
});
