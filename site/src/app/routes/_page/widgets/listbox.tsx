import { createFileRoute } from "@tanstack/react-router";
import { ListboxWidgetRoute } from "../../../../routes/widgets/ListboxWidgetRoute";

export const Route = createFileRoute("/_page/widgets/listbox")({
  component: ListboxWidgetRoute,
});
