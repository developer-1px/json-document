export type CodeLanguage = "json" | "shell" | "text" | "tsx" | "typescript";

export type CodeToken = {
  readonly kind?: "comment" | "key" | "keyword" | "literal" | "punctuation" | "string";
  readonly text: string;
};

const jsonPattern = /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}\[\],:])/g;
const scriptPattern = /(\/\/.*$|\/\*.*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:as|async|await|break|case|catch|class|const|continue|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|interface|let|new|of|return|satisfies|switch|throw|try|type|typeof|var|void|while|with|yield)\b)|(\b(?:true|false|null|undefined|NaN|Infinity)\b|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\](),.;:?=<>+\-*\/|&!])/g;
const shellPattern = /(#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|\b(?:case|do|done|elif|else|esac|export|fi|for|function|if|in|then|while)\b)|(\b(?:true|false|null)\b|-?(?:0|[1-9]\d*)(?:\.\d+)?)|([{}\[\](),;:=<>+\-*\/|&!\\])/g;
const textPattern = /([{}\[\](),;:=<>+\-*\/|&!\\│├└─])/g;

export function codeLanguage(value: string | undefined): CodeLanguage {
  switch (value?.toLowerCase()) {
    case "js":
    case "javascript":
    case "ts":
    case "typescript":
      return "typescript";
    case "jsx":
    case "tsx":
      return "tsx";
    case "bash":
    case "sh":
    case "shell":
      return "shell";
    case "json":
      return "json";
    default:
      return "text";
  }
}

export function codeLanguageLabel(language: CodeLanguage): string {
  switch (language) {
    case "json": return "JSON";
    case "shell": return "Shell";
    case "tsx": return "TSX";
    case "typescript": return "TypeScript";
    case "text": return "Text";
  }
}

export function tokenizeCodeLine(line: string, language: CodeLanguage): ReadonlyArray<CodeToken> {
  const pattern = language === "json"
    ? jsonPattern
    : language === "typescript" || language === "tsx"
      ? scriptPattern
      : language === "shell"
        ? shellPattern
        : textPattern;

  return tokenize(line, pattern, language);
}

function tokenize(line: string, pattern: RegExp, language: CodeLanguage): ReadonlyArray<CodeToken> {
  const tokens: CodeToken[] = [];
  let cursor = 0;

  for (const match of line.matchAll(pattern)) {
    const index = match.index;
    if (index > cursor) tokens.push({ text: line.slice(cursor, index) });
    tokens.push({ text: match[0], kind: tokenKind(match, language) });
    cursor = index + match[0].length;
  }

  if (cursor < line.length) tokens.push({ text: line.slice(cursor) });
  return tokens;
}

function tokenKind(match: RegExpMatchArray, language: CodeLanguage): CodeToken["kind"] {
  if (language === "json") {
    if (match[1]) return "key";
    if (match[2]) return "string";
    if (match[3] || match[4]) return "literal";
    return "punctuation";
  }

  if (language === "text") return "punctuation";
  if (match[1]) return "comment";
  if (match[2]) return "string";
  if (match[3]) return "keyword";
  if (match[4]) return "literal";
  return "punctuation";
}
