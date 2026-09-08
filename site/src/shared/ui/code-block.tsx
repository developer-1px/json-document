import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { createWebClipboardTextWriter } from "@interactive-os/json-document-web";
import { useVirtualSelectionScope } from "@interactive-os/json-document-react";
import { codeLanguageLabel, tokenizeCodeLine, type CodeLanguage } from "./code-tokens";
import { Command } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "./styles";

type CodeBlockSize = "compact" | "content" | "standard" | "tall";

const clipboardTextWriter = createWebClipboardTextWriter();

export type HighlightedCodeToken = {
  readonly content: string;
  readonly color?: string;
};

export function CodeBlock(props: {
  readonly source: string;
  readonly language: CodeLanguage;
  readonly label?: string;
  readonly meta?: ReactNode;
  readonly signal?: ReactNode;
  readonly size?: CodeBlockSize;
  readonly className?: string;
  readonly testId?: string;
  readonly highlightedLines?: ReadonlyArray<ReadonlyArray<HighlightedCodeToken>>;
  readonly linePrefix?: ReactNode;
}) {
  const source = withoutTerminalLineBreak(props.source.replace(/\r\n/g, "\n"));
  const label = props.label ?? codeLanguageLabel(props.language);
  const lines = source.split("\n");
  const [copied, setCopied] = useState(false);
  const selectionRef = useVirtualSelectionScope<HTMLPreElement>({
    activation: "contained",
    readAllText: () => source,
  });

  useEffect(() => setCopied(false), [source]);

  async function copySource() {
    const result = await clipboardTextWriter.writeText(source);
    setCopied(result.ok);
  }

  return (
    <figure className={classes("m-0", ui.code.block.frame, props.className)} aria-label={label}>
      <figcaption className="sr-only">
        {label}
        {props.meta ? <> · {props.meta}</> : null}
        {props.signal ? <> · {props.signal}</> : null}
      </figcaption>
      <Command
        rootClassName={ui.code.block.copyRoot}
        label={copied ? "Copied" : "Copy"}
        className={ui.code.block.copy}
        data-copied={copied}
        onClick={() => void copySource()}
      >
        <CopyIcon copied={copied} />
      </Command>
      <pre
        ref={selectionRef}
        data-testid={props.testId}
        className={classes(ui.code.block.viewport[props.size ?? "standard"], ui.code.block.pre)}
      >
        <code className={ui.code.block.code}>
          {lines.map((line, lineIndex) => (
            <Fragment key={`${lineIndex}:${line}`}>
              <span className={ui.code.block.line}>
                <span className={ui.code.block.lineNumber} data-line-number={lineIndex + 1} aria-hidden="true" />
                <span
                  className={ui.code.block.lineContent}
                  data-code-line
                  {...(props.language === "json" ? { "data-json-line": true } : {})}
                >
                  {props.linePrefix}
                  {props.highlightedLines?.[lineIndex]?.map((token, tokenIndex) => (
                    <span key={`${tokenIndex}:${token.content}`} style={{ color: token.color }}>
                      {token.content}
                    </span>
                  )) ?? tokenizeCodeLine(line, props.language).map((token, tokenIndex) => token.kind ? (
                    <span
                      className={ui.code.block.token[token.kind]}
                      data-code-token={token.kind}
                      {...(props.language === "json" ? { "data-json-token": token.kind } : {})}
                      key={`${tokenIndex}:${token.text}`}
                    >
                      {token.text}
                    </span>
                  ) : token.text)}
                </span>
              </span>
              {lineIndex < lines.length - 1 ? "\n" : null}
            </Fragment>
          ))}
        </code>
      </pre>
    </figure>
  );
}

function CopyIcon(props: { readonly copied: boolean }) {
  return props.copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />;
}

export function InlineCode(props: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly prompt?: boolean;
}) {
  return (
    <code className={classes(ui.code.inline, props.className)}>
      {props.prompt ? <span aria-hidden="true" className={ui.code.prompt}>$ </span> : null}
      {props.children}
    </code>
  );
}

function withoutTerminalLineBreak(source: string): string {
  return source.endsWith("\n") ? source.slice(0, -1) : source;
}
