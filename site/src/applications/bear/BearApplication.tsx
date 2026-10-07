import { BearFiles } from "./BearFiles";
import writingExample from "./examples/ai-native-writing.md?raw";
import { BearChat } from "./BearChat";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { createTextEditor } from "@interactive-os/json-document-editing";
import { MarkdownEditingSurface } from "@interactive-os/json-document-markdown-react";

import { createWebStoredDocument } from "@interactive-os/json-document-web";
import { floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { FileText } from "lucide-react";
import { Popover, Toolbar, Command } from "@interactive-os/json-document-ui-primitives-react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const example = new URLSearchParams(location.search).get("document") === "ai-native-writing";
  const [stored] = useState(() => createWebStoredDocument({
    key: example ? "json-document.bear.ai-native-writing.v1" : "json-document.bear.v1", storage: () => window.localStorage,
    create: () => createTextEditor(createJSONDocument({ source: example ? writingExample : initialSource }), "/source"),
    restore: value => {
      if (!value || typeof value !== "object" || !("source" in value) || typeof value.source !== "string") throw new Error("Invalid Bear document");
      return createTextEditor(createJSONDocument({ source: value.source }), "/source");
    },
  }));
  const editor = stored.source;
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  const text = useSyncExternalStore(editor.subscribe, () => editor.text);
  useEffect(() => stored.connect(), [stored]);

  return (
    <main className="min-h-dvh bg-background-canvas text-foreground-default">
      <header className="fixed left-1/2 top-4 z-30 max-w-[calc(100vw-2rem)] -translate-x-1/2">
        <Toolbar label="문서 도구" className={`${floatingSurface.control} flex-nowrap p-1.5`}>
          <Popover label="문서 메뉴" open={menuOpen} onOpenChange={setMenuOpen} triggerPresentation="icon" trigger={<FileText size={18} aria-hidden="true" />} panelClassName={`${floatingSurface.panel} w-64 max-w-[calc(100vw-3rem)] p-4`}>
            <nav aria-label="문서" className="flex flex-col gap-3 text-sm">
              <a href="?" aria-current={!example ? "page" : undefined}>내 글</a>
              <a href="?document=ai-native-writing" aria-current={example ? "page" : undefined}>작성 예제</a>
              <a download={example ? "AI native로 글을 쓰는 법.md" : "bear.md"} href={`data:text/markdown;charset=utf-8,${encodeURIComponent(text)}`}>Markdown 다운로드</a>
              <span role="status" className="text-xs text-foreground-secondary">{saveState === "saved" ? "이 브라우저에 저장됨" : saveState === "save-error" ? "저장하지 못했습니다" : saveState === "load-error" ? "저장된 글을 읽지 못했습니다. 편집하면 새 내용이 저장됩니다." : "저장 전"}</span>
              {(saveState === "save-error" || saveState === "load-error") && <Command aria-label="저장 다시 시도" onClick={stored.save}>다시 저장</Command>}
            </nav>
          </Popover>
          {(saveState === "save-error" || saveState === "load-error") && <span role="status" className="px-2 text-xs">자동 저장 확인 필요</span>}
          {import.meta.env.DEV && <BearFiles editor={editor} disabled={agentBusy} onOpen={() => setChatKey(key => key + 1)} />}
        </Toolbar>
      </header>
      <MarkdownEditingSurface
        selectionRendering="virtual"
        editor={editor}
        aria-label="Markdown 문서"
        spellCheck={false}
        className="mx-auto min-h-dvh w-full max-w-3xl px-6 pb-40 pt-28 text-lg leading-loose focus-visible:outline-none sm:px-12 sm:pt-32"
      />
      {import.meta.env.DEV && <BearChat key={chatKey} editor={editor} onBusyChange={setAgentBusy} />}
    </main>
  );
}
