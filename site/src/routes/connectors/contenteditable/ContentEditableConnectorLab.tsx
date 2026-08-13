import { useState } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { useReactConnector } from "@interactive-os/json-document-react";
import { ContentEditable } from "@interactive-os/json-document-contenteditable";
import { JsonInspector } from "../../../shared/ui/json-inspector";
import { classes, ui } from "../../../shared/ui/styles";

export function ContentEditableConnectorLab() {
  const [document] = useState(() => createJSONDocument({
    title: "Type in the title field",
    note: "The note field stays independent",
  }));
  const value = useReactConnector(document);

  return (
    <section aria-label="Contenteditable document surface" className={classes("p-4", ui.surface.raised)}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className={ui.text.label}>Title</span>
            <ContentEditable
              aria-label="Title"
              className={ui.field.control}
              document={document}
              pointer="/title"
            />
          </label>
          <label className="grid gap-1">
            <span className={ui.text.label}>Note</span>
            <ContentEditable
              aria-label="Note"
              className={ui.field.control}
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
