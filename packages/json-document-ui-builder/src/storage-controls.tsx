import { useRef, useState } from "react";
import { readUIBuilderProject, type ObjectEditor } from "@interactive-os/json-document-editing";
import { downloadWebDocumentFile, readWebDocumentFile, type WebDocumentSaveState } from "@interactive-os/json-document-web";
import { Command, Popover, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";

/** Local persistence controls; serialization belongs to Web, project validation and replacement to Editing. */
export function UIBuilderStorageControls({editor, state, retry}: {readonly editor: ObjectEditor; readonly state: WebDocumentSaveState; readonly retry: () => void}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const label = state === "saved" ? "저장됨" : state === "saving" || state === "unsaved" ? "저장 중…" : "저장 확인";
  return <Popover label="문서 보관" open={open} onOpenChange={setOpen} trigger={label} panelClassName={`${floatingSurface.panel} builder-catalog-panel`}>
    <div className="builder-binding-fields">
      <p role="status">{state === "saved" ? "이 브라우저에 자동 저장되었습니다." : state === "saving" ? "변경 내용을 저장하고 있어요." : state === "load-error" ? "저장된 문서를 읽지 못했습니다. 기존 저장값은 유지됩니다." : state === "save-error" ? "저장하지 못했습니다. 다른 탭에서 편집했다면 파일로 백업한 뒤 새로고침해 주세요." : "문서를 저장하고 있어요."}</p>
      <p>화면·데이터·연결·액션·실행 결과를 함께 보관합니다. 파일 백업은 다른 기기로 옮길 때도 사용할 수 있어요.</p>
      <Command onClick={() => downloadWebDocumentFile(editor.snapshot.value, "ui-builder-project.json")}>파일로 백업</Command>
      <Command onClick={() => input.current?.click()}>파일에서 복원</Command>
      <input ref={input} type="file" accept=".json,application/json" hidden aria-label="복원할 프로젝트 파일" onChange={async event => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
        if (!file) return;
        try {
          const project = readUIBuilderProject(await readWebDocumentFile(file));
          const result = editor.dispatch({type: "document.replace", document: project});
          if (!result.ok) throw new Error("문서를 복원하지 못했습니다.");
          setError(""); setOpen(false);
        } catch(e) {setError(e instanceof Error ? e.message : "문서 파일을 확인해 주세요.");}
      }} />
      <p>복원은 현재 문서를 바꿉니다. 실행 취소로 되돌릴 수 있어요.</p>
      {(state === "save-error" || state === "load-error") && <Command onClick={retry}>저장 재시도</Command>}
      {error && <p role="alert">{error}</p>}
    </div>
  </Popover>;
}
