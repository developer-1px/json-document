import { useState } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { createMarkdownTableEditor } from "@interactive-os/json-document-editing";
import { createSheetEditor, createTextEditor, sheetColumnLabel, type SheetDocument } from "@interactive-os/json-document-editing";
import { ProductShell, Tabs } from "@interactive-os/json-document-ui-primitives-react";
import { SheetHand } from "@interactive-os/json-document-sheet";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";
import { Inspector } from "../../shared/ui/inspector";

const initialSheet: SheetDocument = {
  columns: [
    { id: "name", label: "Name" },
    { id: "status", label: "Status" },
    { id: "owner", label: "Owner" },
  ],
  rows: [
    { id: "row-1", cells: { name: "Alpha", status: "Draft", owner: "Mina" } },
    { id: "row-2", cells: { name: "Beta", status: "Ready", owner: "Theo" } },
    { id: "row-3", cells: { name: "Gamma", status: "Review", owner: "June" } },
    { id: "row-4", cells: { name: "Delta", status: "Done", owner: "Sol" } },
  ],
};

export function SheetDemo() {
  const [sheet] = useState(() => createSheetEditor(initialSheet));
  const [text] = useState(() => createTextEditor(createJSONDocument("| 문법 | 표현 |\n| --- | --- |\n| 강조 | **굵게** |")));
  const [markdown] = useState(() => createMarkdownTableEditor(text, () => 0));
  const [mode, setMode] = useState<"sheet" | "markdown">("sheet");
  const editor = mode === "sheet" ? sheet : markdown;
  const snapshot = useEditingSnapshot(editor);
  const source = useEditingSnapshot(text);

  return <DemoPage documentation={<PageHeader illustration="braces" title="Sheet">셀을 선택하고 Enter 또는 더블클릭으로 편집하세요. 방향키·Tab으로 이동하고 Shift로 범위를 확장합니다.</PageHeader>}>
    <Tabs label="문서 형식" value={mode} onValueChange={setMode} options={[{id: "sheet", label: "Sheet"}, {id: "markdown", label: "Markdown"}]} tabId={value => `sheet-${value}-tab`} panelId={value => `sheet-${value}-panel`} />
    <section role="tabpanel" id={`sheet-${mode}-panel`} aria-labelledby={`sheet-${mode}-tab`}>
    <ProductShell inspector={<Inspector placement="inline" items={[
      {label: mode === "sheet" ? "Canonical JSON" : "Markdown 원문", value: mode === "sheet" ? snapshot.value : source.value, testId: "sheet-canonical-json", size: "tall"},
      {label: "Selection", meta: `열 좌표 A–${sheetColumnLabel((snapshot.value as SheetDocument).columns.length ? (snapshot.value as SheetDocument).columns.length - 1 : 0)}`, value: snapshot.selection, testId: "sheet-selection-json", size: "compact"},
    ]} />}><SheetHand key={mode} editor={editor} label="Project sheet" headerRow={mode === "markdown"} /></ProductShell>
    </section>
  </DemoPage>;
}
