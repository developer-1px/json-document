import { MarkdownRenderer } from "@interactive-os/json-document-markdown-react";
import "@interactive-os/json-document-markdown-react/styles.css";
import { PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const streamed = `## Streaming Markdown

불완전한 **강조와 GFM 표도 다음 delta를 기다리는 동안 안정적으로 렌더링됩니다.

| Capability | Owner |
| --- | --- |
| repair | projection |
| design | renderer |`;

export function MarkdownDemoRoute() {
  return <>
    <PageHeader label="Markdown · Usage" title="하나의 정본 renderer가 정적 문서와 스트림을 함께 다룹니다." illustration="terminal">
      canonical source를 바꾸지 않고 render projection만 복구하며, component renderer를 교체할 수 있습니다.
    </PageHeader>
    <article className={classes("mx-auto w-full max-w-3xl p-6", ui.surface.raised)}>
      <MarkdownRenderer content={streamed} streaming components={{ strong: ({ children }) => <strong className={ui.text.heading}>{children}</strong> }} />
    </article>
  </>;
}
