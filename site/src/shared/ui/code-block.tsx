import { Fragment, useEffect, useState, type ReactNode } from "react";
import { codeLanguageLabel, tokenizeCodeLine, type CodeLanguage } from "./code-tokens";
import { classes, ui } from "./styles";

type CodeBlockSize = "compact" | "content" | "standard" | "tall";

export function CodeBlock(props: {
  readonly source: string;
  readonly language: CodeLanguage;
  readonly label?: string;
  readonly meta?: ReactNode;
  readonly signal?: ReactNode;
  readonly size?: CodeBlockSize;
  readonly className?: string;
  readonly testId?: string;
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
      <figcaption className={ui.code.block.header}>
        <span className={ui.code.block.label}>{label}</span>
        <span className="ml-auto flex items-center gap-3">
          {props.meta ? <span className={ui.code.block.meta}>{props.meta}</span> : null}
          {props.signal ? <span className={ui.code.block.signal}>{props.signal}</span> : null}
          <button
            className={ui.code.block.copy}
            data-copied={copied}
            onClick={() => void copySource()}
            type="button"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </span>
      </figcaption>
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
                  {tokenizeCodeLine(line, props.language).map((token, tokenIndex) => token.kind ? (
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
