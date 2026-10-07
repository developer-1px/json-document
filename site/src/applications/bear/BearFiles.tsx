import { useEffect, useState, useSyncExternalStore } from "react";
import type { TextEditor } from "@interactive-os/json-document-editing";
import { Choice, Command, Field } from "@interactive-os/json-document-ui-primitives-react";
import { listLocalMarkdownFiles, readLocalMarkdownFile, saveLocalMarkdownFile, type LocalMarkdownFile, type LocalMarkdownDirectory } from "../../app/local-markdown-api";

export function BearFiles({ editor, disabled, onOpen }: { editor: TextEditor; disabled: boolean; onOpen: () => void }) {
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
      setOpened(file); setName(file.name); onOpen();
    });
  };
  const save = () => void run(async () => {
    const filename = name.trim().endsWith(".md") ? name.trim() : `${name.trim()}.md`;
    const file = await saveLocalMarkdownFile(filename, editor.text, opened?.name === filename ? opened.version : null);
    setOpened(file); setName(file.name);
    await refresh();
  });
  return <section aria-label="로컬 Markdown 파일" className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 px-6 pt-4 text-sm sm:px-12">
    <Choice id="bear-file" label="파일 불러오기" presentation="popup" value={opened?.name ?? ""} options={[{ id: "", label: "파일 불러오기" }, ...directory.files.map(name => ({ id: name, label: name }))]} onValueChange={open} disabled={disabled || busy} />
    <Command label="파일 목록 새로고침" disabled={busy || disabled} onClick={() => { void run(async () => { await refresh(); }); }}>새로고침</Command>
    <Field label="파일 이름" value={name} onValueChange={setName} disabled={busy || disabled} className="min-w-0 flex-1" />
    <Command label="파일 저장" disabled={busy || disabled || !name.trim()} onClick={save}>파일 저장</Command>
    <span role="status" className="text-foreground-secondary">{busy ? "파일 처리 중…" : opened ? (opened.source === source ? "파일에 저장됨" : "파일에 저장할 변경 있음") : "새 이름으로 저장하면 파일이 만들어집니다."}</span>
    {directory.directory && <span className="w-full break-all text-xs text-foreground-secondary">보관함: {directory.directory}</span>}
    {error && <p role="alert" className="w-full">{error}</p>}
  </section>;
}
