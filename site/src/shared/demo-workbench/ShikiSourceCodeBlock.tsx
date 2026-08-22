import { useEffect, useState } from "react";
import { CodeBlock, type HighlightedCodeToken } from "../ui/code-block";
import type { CodeLanguage } from "../ui/code-tokens";

export function ShikiSourceCodeBlock(props: {
  readonly language: CodeLanguage;
  readonly source: string;
}) {
  const [highlightedLines, setHighlightedLines] = useState<ReadonlyArray<ReadonlyArray<HighlightedCodeToken>>>();

  useEffect(() => {
    let current = true;
    setHighlightedLines(undefined);
    void import("./shiki-highlighter")
      .then(({ highlightSource }) => highlightSource(props.source, props.language))
      .then((lines) => {
        if (current) setHighlightedLines(lines);
      })
      .catch(() => undefined);
    return () => { current = false; };
  }, [props.language, props.source]);

  return (
    <div data-source-highlighter={highlightedLines === undefined ? "fallback" : "shiki"}>
      <CodeBlock
        highlightedLines={highlightedLines}
        language={props.language}
        size="content"
        source={props.source}
      />
    </div>
  );
}
