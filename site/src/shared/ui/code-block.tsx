import type {ReactNode} from "react";
import {CodeBlock as SharedCodeBlock, InlineCode, type CodeBlockProps} from "@interactive-os/json-document-ui-primitives-react";
import {useVirtualSelectionScope} from "@interactive-os/json-document-react";
import {codeLanguageLabel, tokenizeCodeLine, type CodeLanguage} from "./code-tokens";

export {InlineCode};
export type HighlightedCodeToken = {readonly content: string; readonly color?: string};

/** Site syntax policy; code surface/copy and virtual selection each use their canonical owner. */
export function CodeBlock({highlightedLines, linePrefix, ...props}: Omit<CodeBlockProps, "language" | "renderLine" | "codeRef"> & {
  readonly language: CodeLanguage;
  readonly highlightedLines?: ReadonlyArray<ReadonlyArray<HighlightedCodeToken>>;
  readonly linePrefix?: ReactNode;
}) {
  const selection = useVirtualSelectionScope<HTMLPreElement>({activation: "contained", readAllText: () => props.source});
  return <SharedCodeBlock {...props} label={props.label ?? codeLanguageLabel(props.language)} codeRef={selection} renderLine={(line, index) => <>{linePrefix}{highlightedLines?.[index]?.map((token, i) => <span key={i} style={{color:token.color}}>{token.content}</span>) ?? tokenizeCodeLine(line, props.language).map((token, i) => token.kind ? <span key={i} data-code-token={token.kind} {...(props.language === "json" ? {"data-json-token":token.kind} : {})}>{token.text}</span> : token.text)}</>}/>;
}
