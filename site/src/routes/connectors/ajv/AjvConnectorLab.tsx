import { useState } from "react";
import { createJSONDocument, type JSONPatchValidationResult } from "@interactive-os/json-document";
import { createAjvValidator } from "@interactive-os/json-document-ajv";
import { useEditing, useReactConnector } from "@interactive-os/json-document-react";
import { Ajv } from "ajv";
import { Inspector } from "../../../shared/ui/inspector";
import { ActionButton, SelectableItem } from "../../../shared/ui/interactive";
import { classes, ui } from "../../../shared/ui/styles";

const ajv = new Ajv({ useDefaults: true });
const validateProfile = ajv.compile({
  type: "object",
  properties: {
    profile: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 3 },
        enabled: { type: "boolean", default: true },
      },
      required: ["title"],
      additionalProperties: false,
    },
  },
  required: ["profile"],
  additionalProperties: false,
});

type ProfileDocument = {
  readonly profile: {
    readonly title: string;
    readonly enabled?: boolean;
  };
};

const accepted: JSONPatchValidationResult = { ok: true };

export function AjvConnectorLab() {
  const [document] = useState(() => createJSONDocument(
    { profile: { title: "Draft" } },
    { validate: createAjvValidator(validateProfile) },
  ));
  const value = useReactConnector(document) as ProfileDocument;
  const [draft, setDraft] = useState(value.profile.title);
  const [result, setResult] = useState<JSONPatchValidationResult>(accepted);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const failedPointer = result.ok ? null : result.pointer ?? null;
  const editing = useEditing({
    selectedKeys: [focusKey, failedPointer].filter((key): key is string => key !== null),
    focusKey,
    onSelect: (key) => setFocusKey(key),
  });
  const title = editing.getItem("/profile/title");

  function commitDraft() {
    setResult(document.commit([
      { op: "replace", path: "/profile/title", value: draft },
    ]));
  }

  return (
    <section aria-label="Ajv validation" className={classes("p-4", ui.surface.raised)}>
      <div className="mb-4">
        <p className={ui.text.label}>createAjvValidator</p>
        <h2 className={classes("mb-1 mt-1", ui.text.heading)}>Compiled validation boundary</h2>
        <p className={classes("m-0", ui.text.meta)}>
          Try fewer than 3 characters, then a valid title. Invalid commits preserve canonical JSON, and Ajv&apos;s default enabled value is never adopted.
        </p>
      </div>

      <SelectableItem
        as="label"
        selected={title.getIsSelected()}
        focus={title.getIsFocus()}
        className={classes("grid gap-1 p-2", ui.text.meta)}
      >
        Profile title draft
        <input
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onFocus={title.getPressHandler()}
          className={ui.field.control}
        />
      </SelectableItem>
      <ActionButton kind="primary" onClick={commitDraft} className="mt-3">
        Commit draft
      </ActionButton>

      <Inspector className="mt-4" label="Inspect validation state" items={[
        { label: "Commit result", testId: "ajv-validation-result", value: result },
        { label: "Canonical JSON", testId: "ajv-document-json", value },
      ]} />
    </section>
  );
}
