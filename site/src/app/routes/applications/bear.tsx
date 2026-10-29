import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { createTextEditor } from "@interactive-os/json-document-editing";
import { createWebStoredDocument } from "@interactive-os/json-document-web";
import { BearApplication } from "../../../applications/bear/BearApplication";
import { BearFiles } from "../../../applications/bear/BearFiles";
import { BearChat } from "../../../applications/bear/BearChat";
import writingExample from "../../../applications/bear/examples/ai-native-writing.md?raw";

export const Route = createFileRoute("/applications/bear")({ component: LocalBearApplication });

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

function LocalBearApplication() {
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
  useEffect(() => stored.connect(), [stored]);
  const status = saveState === "saved" ? "이 브라우저에 저장됨" : saveState === "save-error" ? "저장하지 못했습니다" : saveState === "load-error" ? "저장된 글을 읽지 못했습니다. 편집하면 새 내용이 저장됩니다." : "저장 전";
  return <BearApplication document={{ editor, status, retry: saveState.endsWith("error") ? stored.save : undefined }}
    downloadName={example ? "AI native로 글을 쓰는 법.md" : "bear.md"}
    menu={<><a href="?" aria-current={!example ? "page" : undefined}>내 글</a><a href="?document=ai-native-writing" aria-current={example ? "page" : undefined}>작성 예제</a></>}
    tools={import.meta.env.DEV && <BearFiles editor={editor} disabled={agentBusy} onOpen={() => setChatKey(key => key + 1)} />}
    chat={import.meta.env.DEV && <BearChat key={chatKey} editor={editor} onBusyChange={setAgentBusy} />} />;
}
