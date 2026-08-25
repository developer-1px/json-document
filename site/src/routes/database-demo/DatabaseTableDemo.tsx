import { useState, type CSSProperties } from "react";
import { DatabaseHand } from "@interactive-os/json-document-database";
import "@interactive-os/json-document-database/styles.css";
import { createDatabaseEditor, type DatabaseDocument, type DatabaseEditor } from "@interactive-os/json-document-editing";
import { Inspector } from "../../shared/ui/inspector";
import { ProductApp } from "../../shared/ui/primitives";
import { initialDatabase } from "./initial-database";

export function DatabaseTableDemo() {
  const [editor] = useState<DatabaseEditor>(() => createDatabaseEditor(initialDatabase));
  return (
    <ProductApp canvasClassName="relative overflow-auto p-0">
      <DatabaseHand
        editor={editor}
        viewId="table"
        labels={{ ariaLabel: "Notion-style database" }}
        style={{
          "--jd-db-accent": "#de6d55",
          "--jd-db-border": "#d8d1c5",
          "--jd-db-selection-bg": "#fbf8f2",
        } as CSSProperties}
        createRecord={() => ({ id: nextRecordId(editor) })}
        renderToolbar={(context) => context.nativeTextLease ? (
          <output data-testid="native-text-lease">
            Native text lease · {context.nativeTextLease.recordId}/{context.nativeTextLease.propertyId}{context.nativeTextLease.composing ? " · composing" : ""}
          </output>
        ) : <output data-testid="native-text-lease">Structural navigation</output>}
        renderInspector={(context) => (
          <Inspector placement="inline" label="Inspect database state" items={[
            { label: "result", meta: context.result?.ok === false ? context.result.code : context.result?.ok ? "ok" : "none yet", value: context.result, testId: "database-result-json" },
            { label: "Persistent Table view", value: context.view, testId: "database-view-json" },
            { label: "Structural selection", value: context.snapshot.selection, testId: "database-selection-json", size: "compact" },
            { label: "Canonical database", signal: `revision ${context.snapshot.revision}`, value: context.document, testId: "database-document-json" },
          ]} />
        )}
      />
    </ProductApp>
  );
}

function nextRecordId(editor: DatabaseEditor): string {
  const ids = new Set((editor.snapshot.value as DatabaseDocument).records.map((record) => record.id));
  let index = 1;
  while (ids.has(`page-${index}`)) index += 1;
  return `page-${index}`;
}
