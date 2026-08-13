import type { ReactNode } from "react";
import { CodeBlock } from "./code-block";
import { PageFrame, PageHeader } from "./primitives";
import { classes, ui } from "./styles";

export function ExampleWorkbench(props: {
  readonly title: string;
  readonly description: string;
  readonly scenario: string;
  readonly summary: string;
  readonly source: string;
  readonly actions: ReactNode;
  readonly live: ReactNode;
  readonly inspectors: ReactNode;
}) {
  return (
    <PageFrame>
      <PageHeader
        label="Example Workbench"
        title={props.title}
        illustration="cursor"
        aside={<div className="flex flex-wrap justify-start gap-1 lg:justify-end">{props.actions}</div>}
      >
        {props.description}
      </PageHeader>

      <section aria-label={`${props.scenario} scenario`} className={ui.workbench.exampleShell}>
        <header className={ui.workbench.exampleScenario}>
          <span className={ui.workbench.exampleMarker} aria-hidden="true" />
          <div>
            <div className={ui.text.label}>{props.scenario}</div>
            <div className={ui.text.meta}>{props.summary}</div>
          </div>
        </header>

        <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <section aria-label="Live example" className={classes("min-w-0 p-3", ui.surface.raised)}>
            {props.live}
          </section>
          <CodeBlock language="typescript" size="content" source={props.source} />
        </div>

        <div className={ui.workbench.exampleInspectors}>{props.inspectors}</div>
      </section>
    </PageFrame>
  );
}
