import { Fragment, useEffect, useState, type ReactNode } from "react";
import { codeLanguageLabel, tokenizeCodeLine, type CodeLanguage } from "./code-tokens";
import { IconButton } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "./styles";

type CodeBlockSize = "compact" | "content" | "standard" | "tall";

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
}) {
  const source = withoutTerminalLineBreak(props.source.replace(/\r\n/g, "\n"));
  const label = props.label ?? codeLanguageLabel(props.language);
  const lines = source.split("\n");
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [source]);

  async function copySource() {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure className={classes("m-0", ui.code.block.frame, props.className)} aria-label={label}>
      <figcaption className="sr-only">
        {label}
        {props.meta ? <> · {props.meta}</> : null}
        {props.signal ? <> · {props.signal}</> : null}
      </figcaption>
      <IconButton
        label={copied ? "Copied" : "Copy"}
        className={ui.code.block.copy}
        data-copied={copied}
        onClick={() => void copySource()}
      >
        <CopyIcon copied={copied} />
      </IconButton>
      <pre
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
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
      {props.copied ? (
        <path d="m5 12 4 4L19 6" />
      ) : (
        <>
          <rect height="13" rx="2" width="13" x="9" y="9" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </>
      )}
    </svg>
  );
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
