import { Navigate, createFileRoute } from "@tanstack/react-router";
import { calendarSearch } from "../../../../routes/calendar-demo/calendar-search";

export const Route = createFileRoute("/_page/demo/calendar")({
  validateSearch: calendarSearch,
  component: CalendarLegacyRedirect,
});

function CalendarLegacyRedirect() {
  const search = Route.useSearch();
  return <Navigate to="/applications/calendar" search={search} replace />;
}
