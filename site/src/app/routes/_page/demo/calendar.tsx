import { Navigate, createFileRoute } from "@tanstack/react-router";
import { calendarSearchDefaults } from "../../../../routes/calendar-demo/calendar-search";

export const Route = createFileRoute("/_page/demo/calendar")({
  component: CalendarLegacyRedirect,
});

function CalendarLegacyRedirect() {
  return <Navigate to="/applications/calendar" search={calendarSearchDefaults} replace />;
}
