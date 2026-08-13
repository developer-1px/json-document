import { createFileRoute } from "@tanstack/react-router";
import { SheetDemoRoute } from "../../../../routes/sheet-demo/SheetDemoRoute";

export const Route = createFileRoute("/_page/demo/sheet")({
  component: SheetDemoRoute,
});
