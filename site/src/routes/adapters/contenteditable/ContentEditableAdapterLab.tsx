import { fieldPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { useState } from "react";
import { createJSONDocument, type JSONDocument, type JSONValue } from "@interactive-os/json-document";
import { useEditing, useReactConnector, type Editing } from "@interactive-os/json-document-react";
import { ContentEditable } from "@interactive-os/json-document-contenteditable";
import { Inspector } from "../../../shared/ui/inspector";
import { SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { classes, ui } from "../../../shared/ui/styles";

export function ContentEditableAdapterLab() {
  const [document] = useState(() => createJSONDocument({
    title: "Edit this title here.\nAdd a second line.",
    note: "This note is independent.\nIt stays unchanged.",
  }));
  const value = useReactConnector(document);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const editing = useEditing({
    selectedKeys: focusKey === null ? [] : [focusKey],
    focusKey,
    onSelect: (pointer) => setFocusKey(pointer),
  });

  return (
    <section aria-label="Contenteditable document surface" className={classes("p-group")}>
      <div className="grid gap-group lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <div className="grid gap-group">
          <header className="grid gap-related">
            <div className="flex flex-wrap items-center gap-related">
              <h2 className={contentPresentation.itemTitle}>Native editing surface</h2>
              <code className={ui.code.inline}>contenteditable=&quot;true&quot;</code>
            </div>
            <p className={contentPresentation.caption}>
              Click either canvas and edit its text. Every native input commits only the JSON pointer shown above it.
            </p>
          </header>
          <PointerCanvas
            document={document}
            editing={editing}
            label="Title canvas"
            pointer="/title"
            ariaLabel="Title"
          />
          <PointerCanvas
            document={document}
            editing={editing}
            label="Note canvas"
            pointer="/note"
            ariaLabel="Note"
          />
        </div>
        <Inspector label="Inspect contenteditable document" items={[
          { label: "document.value", testId: "contenteditable-document-json", value },
        ]} />
      </div>
    </section>
  );
}

function PointerCanvas(props: {
  readonly document: JSONDocument;
  readonly editing: Editing<JSONValue, string>;
  readonly label: string;
  readonly pointer: string;
  readonly ariaLabel: string;
}) {
  const item = props.editing.getItem(props.pointer);
  return (
    <SelectableItem
      as="label"
      selected={item.getIsSelected()}
      focus={item.getIsFocus()}
      className="grid gap-related p-related"
      onFocus={item.getPressHandler()}
    >
      <span className="flex items-center justify-between gap-related">
        <span className={contentPresentation.caption}>{props.label}</span>
        <code className={ui.code.inline}>{props.pointer}</code>
      </span>
      <ContentEditable
        aria-label={props.ariaLabel}
        className={classes("min-h-28 whitespace-pre-wrap", fieldPresentation.standard)}
        document={props.document}
        pointer={props.pointer}
      />
    </SelectableItem>
  );
}
