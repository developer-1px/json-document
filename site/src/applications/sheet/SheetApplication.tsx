import {createSheetDocument} from "@interactive-os/json-document-sheet-document";
import {useEffect, useState, useSyncExternalStore} from "react";
import {createSheetEditor, sheetSelectionSummary, type SheetDocument} from "@interactive-os/json-document-editing";
import {useEditingSnapshot} from "@interactive-os/json-document-react";
import {createWebStoredDocument} from "@interactive-os/json-document-web";
import {SheetHand} from "@interactive-os/json-document-sheet";
import {Command, Field, Popover, Toolbar, floatingSurface} from "@interactive-os/json-document-ui-primitives-react";
import {Save, FileSpreadsheet} from "lucide-react";
import "./sheet-application.css";

export function SheetApplication() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stored] = useState(() => createWebStoredDocument({key:"json-document.sheet.v1",storage:() => window.localStorage,
    create:() => createSheetEditor(createSheetDocument({rows:40,columns:12,name:"제목 없는 시트",columnWidth:120,rowHeight:32}),{structure:{minimumRows:1,minimumColumns:1}}),
    restore:value => createSheetEditor(value as SheetDocument,{structure:{minimumRows:1,minimumColumns:1}})}));
  const editor = stored.source;
  const snapshot = useEditingSnapshot(editor);
  const state = useSyncExternalStore(stored.subscribe,() => stored.state);
  useEffect(() => stored.connect(),[stored]);
  const summary = sheetSelectionSummary(editor);
  const sheet = snapshot.value as SheetDocument;
  const name = typeof sheet.name === "string" ? sheet.name : "제목 없는 시트";
  return <main className="sheet-application bg-background-canvas text-foreground-default">
    <header className="sheet-application-heading">
      <Toolbar label="시트 문서" className={floatingSurface.control}>
        <Popover label="시트 설정" trigger={<FileSpreadsheet aria-hidden="true" size={18} />} triggerPresentation="icon" open={settingsOpen} onOpenChange={setSettingsOpen} panelClassName={`${floatingSurface.panel} w-64 p-4`}>
          <Field label="시트 이름" value={name} onValueChange={name => editor.dispatch({type:"sheet.rename",name})} />
        </Popover>
        <span className="max-w-40 truncate px-2">{name}</span>
        <span role="status" className="px-2 text-xs text-foreground-muted">{state === "saved" ? "이 브라우저에 저장됨" : state === "load-error" ? "저장된 시트를 읽지 못했습니다. 새 내용은 편집하면 저장됩니다." : state === "save-error" ? "저장하지 못했습니다" : "저장 전"}</span>
        {(state === "save-error" || state === "load-error") && <Command label="저장 다시 시도" onClick={stored.save}><Save aria-hidden="true" size={16} /></Command>}
      </Toolbar>
    </header>
    <section className="sheet-application-workspace" aria-label="시트 작업 영역"><SheetHand editor={editor} label="Sheet" profile="spreadsheet-grid" coordinateHeaders /></section>
    <footer className={`sheet-application-footer ${floatingSurface.control}`}><span>{summary.address || "선택 없음"}</span><span>{summary.selected}개 선택 · {summary.filled}개 입력됨</span></footer>
  </main>;
}
