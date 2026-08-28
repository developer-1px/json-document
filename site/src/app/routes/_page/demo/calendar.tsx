import { createFileRoute } from "@tanstack/react-router";
import { CalendarDemoRoute } from "../../../../routes/calendar-demo/CalendarDemoRoute";
import { calendarSearch } from "../../../../routes/calendar-demo/calendar-search";

export const Route = createFileRoute("/_page/demo/calendar")({
  validateSearch: calendarSearch,
  component: CalendarDemoPage,
});

function CalendarDemoPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CalendarDemoRoute
      view={search.view}
      visibleDate={search.date}
      onLocationChange={(next) => {
        navigate({ search: next });
      }}
    />
  );
}
