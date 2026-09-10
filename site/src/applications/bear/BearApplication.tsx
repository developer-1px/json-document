import { useState } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { createTextEditor } from "@interactive-os/json-document-editing";
import { MarkdownEditingSurface } from "@interactive-os/json-document-markdown-react";

const initialSource = `# Bear

생각이 머무는 곳.

## 한 줄에서 시작하기

**굵게**, *기울임*, ~~지운 말~~, 그리고 \`짧은 코드\`.

> 오래 남기고 싶은 생각을 씁니다.

- 생각을 모으고
- 문장을 다듬습니다.
  - 작은 생각도 놓치지 않도록

1. 먼저 쓰기
2. 다시 읽기

- [x] 첫 문장 쓰기
- [ ] 다음 이야기 이어가기

| 문법 | 표현 |
| --- | --- |
| 제목 | #, ##, ### |
| 강조 | **굵게**, *기울임* |

\`\`\`js
const thought = "한 줄씩";
\`\`\`

[Markdown](https://commonmark.org)은 글의 모양도 원문에 담습니다.

---

이제 여기에 나의 이야기를 씁니다.
`;

export function BearApplication() {
  const [editor] = useState(() => createTextEditor(createJSONDocument({ source: initialSource }), "/source"));

  return (
    <main className="min-h-dvh bg-background-canvas text-foreground-default">
      <MarkdownEditingSurface
        editor={editor}
        aria-label="Markdown 문서"
        spellCheck={false}
        className="mx-auto min-h-dvh w-full max-w-3xl px-6 py-16 text-lg leading-loose focus-visible:outline-none sm:px-12 sm:py-28"
      />
    </main>
  );
}
