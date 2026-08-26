import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createTextRuntime } from "@interactive-os/json-document-collaboration/text";
import { createContentEditableAdapter } from "@interactive-os/json-document-contenteditable-collaboration";
import { IconButton } from "@interactive-os/json-document-ui-primitives-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { Inspector } from "../../shared/ui/inspector";
import { PageHeader, ProductApp } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";

const initial = { title: "여기에서 함께 편집해 보세요." };
const ruleset = { id: "demo/collaboration", digest: "demo/collaboration/v1" } as const;

function runtime(actorId: string) {
  return createTextRuntime(initial, {
    actorId,
    epochId: "demo/collaboration/v1",
    ruleset,
  });
}

export function CollaborationDemoRoute() {
  const [local] = useState(() => runtime("local"));
  const [remote] = useState(() => runtime("remote"));
  const rootRef = useRef<HTMLDivElement>(null);
  const localValue = useSyncExternalStore(local.document.subscribe, () => {
    const result = local.document.at("");
    return result.ok ? result.value : null;
  }, () => initial);
  const replica = useSyncExternalStore(local.replica.subscribe, () => local.replica.status, () => local.replica.status);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    return createContentEditableAdapter({ runtime: local, pointer: "/title", root }).bind();
  }, [local]);

  function receiveRemoteChange() {
    const current = remote.document.at("/title");
    if (!current.ok || typeof current.value !== "string") return;
    remote.document.commit([{ op: "replace", path: "/title", value: `${current.value} · remote` }]);
    local.replica.ingest(remote.replica.exportBundle());
  }

  return (
    <DemoPage documentation={(
      <PageHeader label="Collaboration" title="Collaborative contenteditable" illustration="cursor">
        Collaboration runtime과 native-input DOM lease를 하나의 canonical document surface로 조립합니다.
      </PageHeader>
    )}>
      <ProductApp>
        <section className="grid gap-4 p-4" aria-label="Collaborative text surface">
          <div className="flex items-center justify-between gap-3">
            <p className={classes("m-0", ui.text.meta)}>로컬 입력과 원격 change가 같은 document로 수렴합니다.</p>
            <IconButton label="원격 변경 수신" onClick={receiveRemoteChange}>⇄</IconButton>
          </div>
          <div
            ref={rootRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Collaborative title"
            className={ui.contenteditable.canvas}
          />
          <Inspector label="Inspect collaboration" items={[
            { label: "document", value: localValue, testId: "collaboration-document", size: "compact" },
            { label: "replica", value: replica, testId: "collaboration-replica", size: "compact" },
          ]} />
        </section>
      </ProductApp>
    </DemoPage>
  );
}
