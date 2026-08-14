import { useState } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { useReactConnector } from "@interactive-os/json-document-react";
import { ContentEditable } from "@interactive-os/json-document-contenteditable";
import { JsonInspector } from "../../../shared/ui/json-inspector";
import { classes, ui } from "../../../shared/ui/styles";

export function ContentEditableConnectorLab() {
  const [document] = useState(() => createJSONDocument({
    title: "Edit this title here.\nAdd a second line.",
    note: "This note is independent.\nIt stays unchanged.",
  }));
  const value = useReactConnector(document);

  return (
    <section aria-label="Contenteditable document surface" className={classes("p-4", ui.surface.raised)}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <div className="grid gap-4">
          <header className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={ui.text.heading}>Native editing surface</h2>
              <code className={ui.code.inline}>contenteditable=&quot;true&quot;</code>
            </div>
            <p className={ui.text.meta}>
              Click either canvas and edit its text. Every native input commits only the JSON pointer shown above it.
            </p>
          </header>
          <label className="grid gap-1.5">
            <span className="flex items-center justify-between gap-3">
              <span className={ui.text.label}>Title canvas</span>
              <code className={ui.code.inline}>/title</code>
            </span>
            <ContentEditable
              aria-label="Title"
              className={ui.contenteditable.canvas}
              document={document}
              pointer="/title"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="flex items-center justify-between gap-3">
              <span className={ui.text.label}>Note canvas</span>
              <code className={ui.code.inline}>/note</code>
            </span>
            <ContentEditable
              aria-label="Note"
              className={ui.contenteditable.canvas}
              document={document}
              pointer="/note"
            />
          </label>
        </div>
        <JsonInspector
          label="document.value"
          testId="contenteditable-document-json"
          value={value}
        />
      </div>
    </section>
  );
}
