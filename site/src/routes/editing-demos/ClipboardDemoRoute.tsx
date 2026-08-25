import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { type BlockDocument } from "@interactive-os/json-document-editing";
import { Inspector } from "../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import { optionProps } from "../../shared/widget-binding";
import { useClipboardLab } from "./useClipboardLab";

export function ClipboardDemoRoute() {
  const { clipboard, copy, cut, editing, lastCall, paste, snapshot } = useClipboardLab();

  return (
    <DemoPage documentation={(
      <PageHeader title="Clipboard Demo" illustration="braces">
        Selection에서 시작해 copy 또는 cut으로 구조화된 payload를 만들고 paste에 넘깁니다.
      </PageHeader>

    )}>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="clipboard-input">
          <p className={ui.text.label}>1 · Selection</p>
          <h2 id="clipboard-input" className={classes("mb-2 mt-1", ui.text.heading)}>복사할 블록 선택하기</h2>
          <div className="grid gap-1">
            {(snapshot.value as BlockDocument).blocks.map((block) => (
              <SelectableItem
                key={block.id}
                type="button"
                className={classes("px-3 py-2", ui.surface.selectableBlock)}
                {...optionProps(editing.getItem(block.id))}
              >
                {block.text}
              </SelectableItem>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <ActionButton onClick={copy}>Copy</ActionButton>
            <ActionButton onClick={cut}>Cut</ActionButton>
          </div>
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="clipboard-payload">
          <p className={ui.text.label}>2 · API와 payload</p>
          <h2 id="clipboard-payload" className={classes("mb-2 mt-1", ui.text.heading)}>{lastCall}</h2>
          <Inspector label="Inspect clipboard payload" items={[
            { label: "clipboard", value: clipboard, testId: "clipboard-demo-payload", size: "compact" },
          ]} />
          <ActionButton className="mt-3" data-kind="primary" onClick={paste} disabled={!clipboard}>payload 붙여넣기</ActionButton>
        </section>

        <section className={classes("p-4", ui.surface.raised)} aria-labelledby="clipboard-result">
          <p className={ui.text.label}>3 · 결과</p>
          <h2 id="clipboard-result" className={classes("mb-2 mt-1", ui.text.heading)}>paste하면 복제한 블록을 commit합니다</h2>
          <Inspector label="Inspect paste result" items={[
            { label: "document.value", value: snapshot.value, testId: "clipboard-demo-document", size: "tall" },
            { label: "selection", value: snapshot.selection, testId: "clipboard-demo-selection", size: "compact" },
          ]} />
        </section>
      </div>
    </DemoPage>
  );
}
