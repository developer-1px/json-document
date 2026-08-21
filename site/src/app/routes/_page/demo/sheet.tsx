import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { SheetDemoRoute } from "../../../../routes/sheet-demo/SheetDemoRoute";

export const Route = createFileRoute("/_page/demo/sheet")({
  component: SheetDemoRoute,
  ...defineDemo({ source: "routes/sheet-demo/SheetDemoRoute.tsx" }),
});
