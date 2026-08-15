import type { ReactNode } from "react";
import { CodeBlock } from "./code-block";

export type JsonInspectorSize = "compact" | "standard" | "tall";

export interface JsonInspectorProps {
  readonly label: string;
  readonly value: unknown;
  readonly testId: string;
  readonly meta?: ReactNode;
  readonly signal?: ReactNode;
  readonly size?: JsonInspectorSize;
  readonly className?: string;
}

export function JsonInspector(props: JsonInspectorProps) {
  const source = JSON.stringify(props.value, null, 2) ?? "null";

  return (
    <CodeBlock
      className={props.className}
      label={props.label}
      language="json"
      meta={props.meta}
      signal={props.signal}
      size={props.size}
      source={source}
      testId={props.testId}
    />
  );
}
