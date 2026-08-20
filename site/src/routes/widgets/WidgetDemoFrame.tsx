import type { ReactNode } from "react";
import { type InspectorItem } from "../../shared/ui/inspector";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { PageFrame, PageHeader, type PetiteCatIllustration } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

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
    <PageFrame>
      <PageHeader illustration={props.illustration ?? "cursor"} title={props.title}>
        {props.description}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={classes("p-4", ui.surface.raised)} aria-label={props.widgetLabel}>
          <p className={ui.text.label}>Proof</p>
          <h2 className={classes("mb-3 mt-1", ui.text.heading)}>{props.widgetLabel}</h2>
          {props.widget}
          {props.surface != null ? (
            <div className="mt-4">
              {props.surfaceLabel ? <p className={classes("mb-2 mt-0", ui.text.label)}>{props.surfaceLabel}</p> : null}
              {props.surface}
            </div>
          ) : null}
        </section>
        <section className={classes("p-4", ui.surface.raised)} aria-label="Editing values">
          <p className={ui.text.label}>Editing values</p>
          <h2 className={classes("mb-3 mt-1", ui.text.heading)}>What this reads</h2>
          <div className="grid gap-3">
            {props.values.map((item) => (
              <JsonInspector key={item.testId} {...item} />
            ))}
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
