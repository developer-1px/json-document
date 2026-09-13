## Markdown 원문 편집 surface

`MarkdownEditingSurface`는 `TextEditor`를 받아 Markdown Web의 공개
`createMarkdownEditingBinding` 생성·해제를 React 수명에 연결합니다. React는 편집 DOM의 children을
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

인용문 Enter 연결은 Markdown Web binding이 소유하며 Markdown의 `insertMarkdownParagraph`를 공용 contenteditable `insertBreak`에 연결합니다. 내용이 있으면 인용을 이어 쓰고, 빈 인용 줄에서는 일반 문단으로 나갑니다. 결과는 기존 editor에 한 번 적용하므로 Undo/Redo와 원문 선택을 유지합니다.

## Sheet 표 편집

`MarkdownEditingSurface`는 최상위 GFM 표에 `SheetHand`를 연결합니다. `@interactive-os/json-document-editing`의 `createMarkdownTableEditor(editor, position)`는 Sheet Intent를 Markdown table 원문 변경으로 변환하고 문서 전체 Undo/Redo를 재사용합니다. 셀 UI와 입력 상태는 Hand, 문법 처리는 Markdown, 원문과 History는 TextEditor가 소유합니다. [Sheet API](/docs/api/sheet)와 [Bear](/applications/bear)에서 확인할 수 있습니다.

이 패키지의 기존 `createMarkdownTableEditor` export는 호환용 deprecated 재export입니다. 편집 어댑터 구현과 API 문서는 [Editing owner](/docs/api/editing)에 있습니다.

## 표 셀 초안

`MarkdownCellEditor`는 `SheetCellEditorProps`의 초안을 편집하는 포맷 소유 컴포넌트입니다. `SheetHand.renderEditor`로 연결하며, 확정 전에는 표 원문을 변경하지 않습니다. 기존 Markdown DOM binding에 `revealSyntax:false`를 사용하므로 편집 시에도 strong/emphasis 등 표시를 유지합니다. 초안 입력 수명과 한글 조합은 contenteditable 정본 binding이 담당하고 최종 확정·취소·표 이동은 Hand가 담당합니다.

[Sheet Usage](/demo/sheet)의 Markdown 탭과 [Bear](/applications/bear)가 같은 연결을 사용합니다. Markdown cell editor를 사용할 때 기존 `markdown-editor.css`도 함께 로드해야 합니다.
