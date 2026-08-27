import { createFileRoute } from "@tanstack/react-router";
import { CalendarDemoRoute } from "../../../../routes/calendar-demo/CalendarDemoRoute";

export const Route = createFileRoute("/_page/demo/calendar")({
  component: CalendarDemoRoute,
});
