import type { ReactNode } from "react";
import { classes, ui } from "./styles";

export type ChangeFlowStep = {
  readonly label: string;
  readonly detail: ReactNode;
  readonly status?: "complete" | "current" | "pending";
};

export function ChangeFlow(props: {
  readonly label: string;
  readonly description?: ReactNode;
  readonly steps: ReadonlyArray<ChangeFlowStep>;
  readonly className?: string;
}) {
  return (
    <figure
      aria-label={props.label}
      className={classes("m-0", ui.changeFlow.root, props.className)}
      data-change-flow
    >
      <figcaption className={ui.changeFlow.caption}>
        <span className={ui.changeFlow.title}>{props.label}</span>
        {props.description ? <span className={ui.changeFlow.description}>{props.description}</span> : null}
      </figcaption>
      <ol className={ui.changeFlow.list}>
        {props.steps.map((step, index) => {
          const status = step.status ?? "complete";
          return (
            <li
              className={classes("group", ui.changeFlow.step)}
              data-change-flow-step={status}
              data-status={status}
              key={`${index}:${step.label}`}
            >
              <span aria-hidden="true" className={classes(ui.changeFlow.connector, index === props.steps.length - 1 && "hidden")} />
              <span aria-hidden="true" className={ui.changeFlow.marker} />
              <span className={ui.changeFlow.copy}>
                <span className={ui.changeFlow.label}>{step.label}</span>
                <span className={ui.changeFlow.detail}>{step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
