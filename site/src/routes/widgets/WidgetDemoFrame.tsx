import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import type { ReactNode } from "react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { type InspectorItem } from "../../shared/ui/inspector";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { PageHeader, type PetiteCatIllustration } from "../../shared/ui/primitives";
import { classes } from "../../shared/ui/styles";

export function WidgetDemoFrame(props: {
  readonly title: string;
  readonly description: string;
  readonly illustration?: PetiteCatIllustration;
  readonly widgetLabel: string;
  readonly widget: ReactNode;
  readonly surfaceLabel?: string;
  readonly surface?: ReactNode;
  readonly values: ReadonlyArray<InspectorItem>;
}) {
  return (
    <DemoPage documentation={(
      <PageHeader illustration={props.illustration ?? "cursor"} title={props.title}>
        {props.description}
      </PageHeader>
    )}>
      <div className="grid gap-group lg:grid-cols-2">
        <section className={classes("grid content-start gap-group p-group")} aria-label={props.widgetLabel}>
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>Proof</p>
          <h2 className={contentPresentation.itemTitle}>{props.widgetLabel}</h2></div>
          {props.widget}
          {props.surface != null ? (
            <div className="grid content-start gap-related">
              {props.surfaceLabel ? <p className={classes("mt-0", contentPresentation.caption)}>{props.surfaceLabel}</p> : null}
              {props.surface}
            </div>
          ) : null}
        </section>
        <section className={classes("grid content-start gap-group p-group")} aria-label="Editing values">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>Editing values</p>
          <h2 className={contentPresentation.itemTitle}>What this reads</h2></div>
          <div className="grid gap-related">
            {props.values.map((item) => (
              <JsonInspector key={item.testId} {...item} />
            ))}
          </div>
        </section>
      </div>
    </DemoPage>
  );
}
