import { PageHeader } from "../../shared/ui/primitives";
import { MarkdownContent } from "../../shared/ui/markdown-content";

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
    <article className="w-full max-w-3xl justify-self-center p-group">
      <MarkdownContent content={streamed} streaming />
    </article>
  </>;
}
