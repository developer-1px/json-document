import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ListboxWidgetRoute } from "../../../../routes/widgets/ListboxWidgetRoute";

export const Route = createFileRoute("/_page/widgets/listbox")({
  component: ListboxWidgetRoute,
  ...defineDemo({ source: "routes/widgets/ListboxWidgetRoute.tsx" }),
});
