import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { DatabaseTableDemo } from "./DatabaseTableDemo";

export function DatabaseDemoRoute() {
  return (
    <PageFrame>
        <PageHeader illustration="database" title="Database Demo">
            One canonical database, typed property editors, persistent view configuration, structural selection, and native text leases.
        </PageHeader>
        <DatabaseTableDemo />
    </PageFrame>
  );
}
