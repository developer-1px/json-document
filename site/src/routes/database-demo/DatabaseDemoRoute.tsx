import { DemoSurface } from "../../shared/demo-workbench/DemoSurface";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { DatabaseTableDemo } from "./DatabaseTableDemo";

export function DatabaseDemoRoute() {
  return (
    <PageFrame>
        <PageHeader illustration="database" title="Database Demo">
            One canonical database, typed property editors, persistent view configuration, structural selection, and native text leases.
        </PageHeader>
        <DemoSurface>
          <DatabaseTableDemo />
        </DemoSurface>
    </PageFrame>
  );
}
