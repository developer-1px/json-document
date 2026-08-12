import type { ReactNode } from "react";
import { classes, ui } from "./styles";

type JsonInspectorSize = "compact" | "standard" | "tall";

export function JsonInspector(props: {
  readonly label: string;
  readonly value: unknown;
  readonly testId: string;
  readonly meta?: ReactNode;
  readonly signal?: ReactNode;
  readonly size?: JsonInspectorSize;
  readonly className?: string;
}) {
  const source = JSON.stringify(props.value, null, 2) ?? "null";

  return (
    <figure className={classes("m-0", ui.code.inspector.frame, props.className)} aria-label={props.label}>
      <figcaption className={ui.code.inspector.header}>
        <span className={ui.code.inspector.label}>{props.label}</span>
        <span className="ml-auto flex items-center gap-3">
          {props.meta ? <span className={ui.code.inspector.meta}>{props.meta}</span> : null}
          {props.signal ? <span className={ui.code.inspector.signal}>{props.signal}</span> : null}
        </span>
      </figcaption>
      <pre
        data-testid={props.testId}
        className={classes(ui.code.inspector.viewport[props.size ?? "standard"], ui.code.inspector.pre)}
      >
        <code className={ui.code.inspector.code}>
          {source.split("\n").map((line, index) => (
            <span className={ui.code.inspector.line} key={`${index}:${line}`}>
              <span className={ui.code.inspector.lineNumber} data-line-number={index + 1} aria-hidden="true" />
              <span className={ui.code.inspector.lineContent} data-json-line>{highlightJsonLine(line)}</span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

const tokenPattern = /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}\[\],:])/g;

function highlightJsonLine(line: string): ReadonlyArray<ReactNode> {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(tokenPattern)) {
    const index = match.index;
    if (index > cursor) nodes.push(line.slice(cursor, index));

    const kind = match[1]
      ? "key"
      : match[2]
        ? "string"
        : match[3] || match[4]
          ? "literal"
          : "punctuation";
    nodes.push(
      <span className={ui.code.inspector.token[kind]} data-json-token={kind} key={`${index}:${match[0]}`}>
        {match[0]}
      </span>,
    );
    cursor = index + match[0].length;
  }

  if (cursor < line.length) nodes.push(line.slice(cursor));
  return nodes;
}
