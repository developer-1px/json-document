import { useEffect, useState, useSyncExternalStore } from "react";
import type { TextEditor } from "@interactive-os/json-document-editing";
import { FolderOpen, Save, RefreshCw } from "lucide-react";
import { floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { Choice, Command, Field, Popover } from "@interactive-os/json-document-ui-primitives-react";
import { listLocalMarkdownFiles, readLocalMarkdownFile, saveLocalMarkdownFile, type LocalMarkdownFile, type LocalMarkdownDirectory } from "../../app/local-markdown-api";

export function BearFiles({ editor, disabled, onOpen }: { editor: TextEditor; disabled: boolean; onOpen: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [directory, setDirectory] = useState<LocalMarkdownDirectory>({ directory: "", files: [] });
  const [name, setName] = useState("제목 없는 글.md");
  const [opened, setOpened] = useState<LocalMarkdownFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const source = useSyncExternalStore(editor.subscribe, () => editor.text);
  const refresh = () => listLocalMarkdownFiles().then(setDirectory);
  useEffect(() => { let active = true; listLocalMarkdownFiles().then(value => { if (active) setDirectory(value); }, () => { if (active) setError("파일 목록을 읽지 못했습니다."); }); return () => { active = false; }; }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : "파일 작업에 실패했습니다."); }
    finally { setBusy(false); }
  }
  const open = (filename: string) => {
    if (!filename) return;
    const before = editor.text;
    void run(async () => {
      const file = await readLocalMarkdownFile(filename);
      if (editor.text !== before) throw new Error("불러오는 동안 글이 바뀌었습니다. 다시 선택해 주세요.");
      const result = editor.replace(file.source, { anchor: 0, focus: 0 });
      if (!result.ok) throw new Error("문서를 불러오지 못했습니다.");
      setOpened(file); setName(file.name); setExpanded(false); onOpen();
    });
  };
  const save = () => void run(async () => {
    const filename = name.trim().endsWith(".md") ? name.trim() : `${name.trim()}.md`;
    const file = await saveLocalMarkdownFile(filename, editor.text, opened?.name === filename ? opened.version : null);
    setOpened(file); setName(file.name);
    await refresh();
  });
  return <>
    <Popover label="로컬 파일" open={expanded} onOpenChange={setExpanded} triggerPresentation="icon" trigger={<FolderOpen size={18} aria-hidden="true" />} panelClassName={`${floatingSurface.panel} !-left-12 flex w-64 max-w-[calc(100vw-3rem)] flex-col gap-3 p-4`}>
      <div className="flex items-center gap-2">
        <Choice id="bear-file" label="파일 불러오기" presentation="popup" value={opened?.name ?? ""} options={[{ id: "", label: "파일 불러오기" }, ...directory.files.map(name => ({ id: name, label: name }))]} onValueChange={open} disabled={disabled || busy} />
        <Command label="파일 목록 새로고침" disabled={busy || disabled} onClick={() => { void run(async () => { await refresh(); }); }}><RefreshCw size={16} aria-hidden="true" /></Command>
      </div>
      <Field label="파일 이름" value={name} onValueChange={setName} disabled={busy || disabled} />
    </Popover>
    <Command label="파일 저장" disabled={busy || disabled || !name.trim()} onClick={save}><Save size={18} aria-hidden="true" /></Command>
    <span role="status" className="max-w-36 truncate px-2 text-xs text-foreground-secondary">{busy ? "저장 중…" : opened ? (opened.source === source ? "파일에 저장됨" : "파일에 저장할 변경 있음") : "새 문서"}</span>
    {error && <p role="alert" className={`${floatingSurface.panel} absolute left-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] p-3 text-sm`}>{error}</p>}
  </>;
}
