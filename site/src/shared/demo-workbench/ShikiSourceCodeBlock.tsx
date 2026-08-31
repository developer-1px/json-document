import { useEffect, useRef, useState } from "react";
import { CodeBlock, type HighlightedCodeToken } from "../ui/code-block";
import type { CodeLanguage } from "../ui/code-tokens";

export function ShikiSourceCodeBlock(props: {
  readonly language: CodeLanguage;
  readonly source: string;
}) {
  const [highlightedLines, setHighlightedLines] = useState<ReadonlyArray<ReadonlyArray<HighlightedCodeToken>>>();
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "160px" });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let current = true;
    setHighlightedLines(undefined);
    void import("./shiki-highlighter")
      .then(({ highlightSource }) => highlightSource(props.source, props.language))
      .then((lines) => {
        if (current) setHighlightedLines(lines);
      })
      .catch(() => undefined);
    return () => { current = false; };
  }, [props.language, props.source, visible]);

  return (
    <div
      ref={rootRef}
      className="min-w-0 max-w-full"
      data-source-highlighter={highlightedLines === undefined ? "fallback" : "shiki"}
    >
      <CodeBlock
        highlightedLines={highlightedLines}
        language={props.language}
        size="content"
        source={props.source}
      />
    </div>
  );
}
