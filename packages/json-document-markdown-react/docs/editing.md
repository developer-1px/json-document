## Markdown 원문 편집 surface

`MarkdownEditingSurface`는 `TextEditor`를 받아 Markdown Web projection과 기존
contenteditable 입력 수명을 React에 연결합니다. React는 편집 DOM의 children을
관리하지 않습니다. 문서 모델·명령·selection·history는 Editing이 소유합니다.

```tsx
import { useState } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { createTextEditor } from "@interactive-os/json-document-editing";
import { MarkdownEditingSurface } from "@interactive-os/json-document-markdown-react";
import "@interactive-os/json-document-markdown-web/markdown-editor.css";

function Note() {
  const [editor] = useState(() => createTextEditor(createJSONDocument("**원문**")));
  return <MarkdownEditingSurface editor={editor} aria-label="Markdown 편집" />;
}
```

CommonMark/GFM 전체 문법을 원문 보존 projection으로 표시합니다. native 입력과 한국어 composition 이벤트,
raw text clipboard, `Mod-z`/`Mod-Shift-z`를 연결합니다.
조합 중 Enter 한 번으로 조합 확정과 줄바꿈을 처리하고 다음 줄에서 입력을 이어갑니다.
Undo는 줄바꿈, 확정한 조합 순서로 되돌립니다.
복사·잘라내기·붙여넣기는 원문 selection을 기준으로 처리합니다.
`MarkdownRenderer`의 읽기 전용 GFM/streaming 렌더링은 별도 역할로 유지됩니다.
streaming용 문법 보정 결과는 편집 원문에 기록하지 않습니다.

[Markdown caret Usage](/demo/markdown-caret) · [문서 계약](/docs/api/markdown)

체크박스는 주입한 editor로 클릭·Space 토글을 처리합니다. Delete·Backspace는
todo 전체를 한 번에 지우며, Undo 한 번으로 복원합니다. 기호 표시와 원자 삭제 정책은
Markdown Web과 공용 contenteditable 투영을 사용합니다.

인용문 Enter는 Markdown의 `insertMarkdownParagraph`를 공용 contenteditable `insertBreak`에 연결합니다. 내용이 있으면 인용을 이어 쓰고, 빈 인용 줄에서는 일반 문단으로 나갑니다. 결과는 기존 editor에 한 번 적용하므로 Undo/Redo와 원문 선택을 유지합니다.
