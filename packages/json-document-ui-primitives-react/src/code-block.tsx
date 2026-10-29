import {Fragment, useEffect, useState, type HTMLAttributes, type ReactNode, type Ref} from "react";
import {Check, Copy} from "lucide-react";
import {createWebClipboardTextWriter} from "@interactive-os/json-document-web";
import {Command} from "./controls.js";

export interface CodeBlockProps {
  readonly source: string;
  readonly label?: string;
  readonly language?: string | undefined;
  readonly meta?: ReactNode;
  readonly signal?: ReactNode;
  readonly className?: string;
  readonly size?: "compact" | "content" | "standard" | "tall";
  readonly testId?: string;
  /** The document's canonical selection binding stays with its adapter. */
  readonly codeRef?: Ref<HTMLPreElement>;
  readonly preProps?: HTMLAttributes<HTMLPreElement>;
  readonly renderLine?: (line: string, index: number) => ReactNode;
  /** Structured document nodes may supply their existing rendered children. */
  readonly children?: ReactNode;
}
const clipboard = createWebClipboardTextWriter();

/** One code surface, copy command and line anatomy. Syntax and document bindings are injected. */
export function CodeBlock({source, label = "Code", language, meta, signal, className, size = "standard", testId, codeRef, preProps, renderLine, children}: CodeBlockProps): ReactNode {
  const normalized = source.replace(/\r\n/g, "\n").replace(/\n$/, "");
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [normalized]);
  return <figure className={className} aria-label={label} data-ui-component="code-block" data-code-size={size} data-code-content={children != null ? "structured" : "lines"}>
    <figcaption className="json-document-visually-hidden">{label}{meta && <> · {meta}</>}{signal && <> · {signal}</>}</figcaption>
    <Command rootClassName="json-document-code-copy" label={copied ? "Copied" : "Copy"} data-copied={copied} onClick={async () => {const result = await clipboard.writeText(source); setCopied(result.ok);}}>{copied ? <Check size={14} aria-hidden="true"/> : <Copy size={14} aria-hidden="true"/>}</Command>
    <pre {...preProps} ref={codeRef} data-testid={testId}><code className={language ? `language-${language}` : undefined}>
      {children ?? normalized.split("\n").map((line, index, lines) => <Fragment key={index}><span data-code-region="line"><span data-line-number={index + 1} aria-hidden="true"/><span data-code-line="" {...(language === "json" ? {"data-json-line": true} : {})}>{renderLine ? renderLine(line, index) : line}</span></span>{index < lines.length - 1 ? "\n" : null}</Fragment>)}
    </code></pre>
  </figure>;
}

export function InlineCode({children, prompt, ...attributes}: HTMLAttributes<HTMLElement> & {readonly prompt?: boolean}): ReactNode {
  return <code {...attributes} data-ui-component="inline-code">{prompt && <span aria-hidden="true">$ </span>}{children}</code>;
}
