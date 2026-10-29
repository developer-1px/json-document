import { useState, useSyncExternalStore, type ReactNode } from "react";
import type { TextEditor } from "@interactive-os/json-document-editing";
import { MarkdownEditingSurface } from "@interactive-os/json-document-markdown-react";
import { floatingSurface, Popover, Toolbar, Command } from "@interactive-os/json-document-ui-primitives-react";
import { FileText } from "lucide-react";

export interface BearDocument {
  editor: TextEditor;
  status: string;
  retry?: () => void;
}

/** Storage and document lifecycle belong to the host, never the editing UI. */
export function BearApplication({ document: { editor, status, retry }, downloadName = "bear.md", menu, tools, chat, embedded = false }: {
  document: BearDocument; embedded?: boolean; downloadName?: string; menu?: ReactNode; tools?: ReactNode; chat?: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const text = useSyncExternalStore(editor.subscribe, () => editor.text);

  return (
    <main className={`${embedded ? "relative min-h-full" : "min-h-dvh"} bg-background-canvas text-foreground-default`}>
      <header className={`${embedded ? "relative flex justify-end px-6 pt-3" : "fixed left-1/2 top-4 -translate-x-1/2"} z-30 max-w-[calc(100vw-2rem)]`}>
        <Toolbar label="문서 도구" className={`${embedded ? "" : floatingSurface.control} flex-nowrap p-1.5`}>
          <Popover label="문서 메뉴" open={menuOpen} onOpenChange={setMenuOpen} triggerPresentation="icon" trigger={<FileText size={18} aria-hidden="true" />} panelClassName={`${floatingSurface.panel} w-64 max-w-[calc(100vw-3rem)] p-4`}>
            <nav aria-label="문서" className="flex flex-col gap-3 text-sm">
              {menu}
              <a download={downloadName} href={`data:text/markdown;charset=utf-8,${encodeURIComponent(text)}`}>Markdown 다운로드</a>
              <span role="status" className="text-xs text-foreground-secondary">{status}</span>
              {retry && <Command aria-label="저장 다시 시도" onClick={retry}>다시 저장</Command>}
            </nav>
          </Popover>
          {retry && <span role="status" className="px-2 text-xs">자동 저장 확인 필요</span>}
          {tools}
        </Toolbar>
      </header>
      <MarkdownEditingSurface
        selectionRendering="virtual"
        editor={editor}
        aria-label="Markdown 문서"
        spellCheck={false}
        className={`mx-auto min-h-dvh w-full max-w-3xl px-6 pb-40 focus-visible:outline-none sm:px-12 ${embedded ? "pt-6 text-sm leading-relaxed" : "pt-28 text-lg leading-loose sm:pt-32"}`}
      />
      {chat}
    </main>
  );
}
