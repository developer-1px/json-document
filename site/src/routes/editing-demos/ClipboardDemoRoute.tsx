import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { Copy, Scissors } from "lucide-react";
import { type BlockDocument } from "@interactive-os/json-document-editing";
import { Inspector } from "../../shared/ui/inspector";
import { Command, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { classes } from "../../shared/ui/styles";
import { editingItemProps } from "@interactive-os/json-document-react";
import { useClipboardLab } from "./useClipboardLab";

export function ClipboardDemoRoute() {
  const { clipboard, copy, cut, editing, lastCall, paste, snapshot } = useClipboardLab();

  return (
    <DemoPage documentation={(
      <PageHeader title="Clipboard Demo" illustration="braces">
        Selection에서 시작해 copy 또는 cut으로 구조화된 payload를 만들고 paste에 넘깁니다.
      </PageHeader>

    )}>
      <div className="grid gap-group lg:grid-cols-3">
        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="clipboard-input">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>1 · Selection</p>
          <h2 id="clipboard-input" className={contentPresentation.itemTitle}>복사할 블록 선택하기</h2></div>
          <div className="grid gap-related">
            {(snapshot.value as BlockDocument).blocks.map((block) => (
              <SelectableItem presentation="row"
                key={block.id}
                type="button"
                className={classes("px-related py-related", contentPresentation.itemSummary)}
                {...editingItemProps(editing.getItem(block.id))}
              >
                {block.text}
              </SelectableItem>
            ))}
          </div>
          <div className="flex gap-related">
            <Command label="Copy" onClick={copy}><Copy aria-hidden="true" size={16} /></Command>
            <Command label="Cut" onClick={cut}><Scissors aria-hidden="true" size={16} /></Command>
          </div>
        </section>

        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="clipboard-payload">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>2 · API와 payload</p>
          <h2 id="clipboard-payload" className={contentPresentation.itemTitle}>{lastCall}</h2></div>
          <Inspector label="Inspect clipboard payload" items={[
            { label: "clipboard", value: clipboard, testId: "clipboard-demo-payload", size: "compact" },
          ]} />
          <Command kind="primary" onClick={paste} disabled={!clipboard}>payload 붙여넣기</Command>
        </section>

        <section className={classes("grid content-start gap-group p-group")} aria-labelledby="clipboard-result">
          <div className="grid content-start gap-related"><p className={contentPresentation.caption}>3 · 결과</p>
          <h2 id="clipboard-result" className={contentPresentation.itemTitle}>paste하면 복제한 블록을 commit합니다</h2></div>
          <Inspector label="Inspect paste result" items={[
            { label: "document.value", value: snapshot.value, testId: "clipboard-demo-document", size: "tall" },
            { label: "selection", value: snapshot.selection, testId: "clipboard-demo-selection", size: "compact" },
          ]} />
        </section>
      </div>
    </DemoPage>
  );
}
