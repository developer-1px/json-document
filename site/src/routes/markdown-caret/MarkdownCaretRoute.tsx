import { useState } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { createTextEditor } from "@interactive-os/json-document-editing";
import { useEditingSnapshot, useJSONDocumentValue } from "@interactive-os/json-document-react";
import { MarkdownEditingSurface } from "@interactive-os/json-document-markdown-react";
import { PageHeader } from "../../shared/ui/primitives";
import { JsonInspector } from "../../shared/ui/json-inspector";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { classes, ui } from "../../shared/ui/styles";

const initialSource = "#    Markdown  \n\nMarkdown은 **원문이 정본**입니다. __한글과 😀__ 역시 그대로 편집합니다.\n\n> *인용*과 ~~취소선~~\n> > 중첩 인용\n\n- 불릿\n  - 중첩 불릿\n\n12) 번호 목록\n\n- [x] CommonMark\n- [ ] GFM\n\n| 문법 | 값 |\n| --- | --- |\n| 코드 | `source` |\n\n[링크](https://commonmark.org)\n\n```js\nconst source = \"원문\";\n```";

export function MarkdownCaretRoute() {
  const [document] = useState(() => createJSONDocument({ source: initialSource }));
  const [editor] = useState(() => createTextEditor(document, "/source"));
  const value = useJSONDocumentValue(document);
  const snapshot = useEditingSnapshot(editor);
  return <DemoPage documentation={
    <PageHeader title="Markdown 원문을 직접 편집합니다.">
      제목의 공백은 입력한 만큼 표시되며 ←로 한 칸씩 이동하면 왼쪽 H 표시에 도달합니다. # 입력·Backspace·Delete로 제목 단계를 편집할 수 있습니다. 불릿·번호·인용·펜스도 같은 기호 경계로 이동하고 원문을 편집합니다. 체크박스는 클릭·Space로 체크하고 Delete·Backspace 한 번으로 지웁니다. Undo 한 번이면 복원됩니다. 강조·링크·표는 선택하면 문법이 드러납니다. 선택·복사와 ⌘/Ctrl+Z를 시험해 보세요.
    </PageHeader>
  }>
    <div className="mx-auto grid w-full max-w-3xl gap-8 py-6">
      <MarkdownEditingSurface
        editor={editor}
        aria-label="Markdown 편집"
        data-testid="markdown-editor"
        className={classes("min-h-32 px-2 py-3", ui.state.focus, ui.text.body)}
      />
      <p className={classes("m-0", ui.text.meta)} data-testid="markdown-selection">
        선택 {snapshot.selection.anchor} → {snapshot.selection.focus} · Undo {snapshot.canUndo ? "가능" : "없음"} · Redo {snapshot.canRedo ? "가능" : "없음"}
      </p>
      <JsonInspector label="정본 JSON · source" testId="markdown-source-json" value={value} />
    </div>
  </DemoPage>;
}
