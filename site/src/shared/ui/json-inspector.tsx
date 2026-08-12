import type { ReactNode } from "react";
import { CodeBlock } from "./code-block";

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
