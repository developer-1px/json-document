import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ObjectDemoRoute } from "../../../../routes/object-demo/ObjectDemoRoute";

export const Route = createFileRoute("/_page/demo/object")({
  ...defineDemo({ component: ObjectDemoRoute, source: "routes/object-demo/ObjectDemoRoute.tsx" }),
});
