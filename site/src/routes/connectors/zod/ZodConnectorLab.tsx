import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { useState } from "react";
import { createJSONDocument, type JSONPatchValidationResult } from "@interactive-os/json-document";
import { useEditing, useReactConnector } from "@interactive-os/json-document-react";
import { createZodValidator } from "@interactive-os/json-document-zod";
import * as z from "zod/v4";
import { Inspector } from "../../../shared/ui/inspector";
import { Command, Field, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { classes } from "../../../shared/ui/styles";

const profileSchema = z.object({
  profile: z.object({
    title: z.string().trim().min(3, "Title must contain at least 3 characters."),
  }),
});

type ProfileDocument = {
  readonly profile: {
    readonly title: string;
  };
};

const accepted: JSONPatchValidationResult = { ok: true };

export function ZodConnectorLab() {
  const [document] = useState(() => createJSONDocument(
    { profile: { title: "Draft" } },
    { validate: createZodValidator(profileSchema) },
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
    <section aria-label="Zod validation" className={classes("p-group")}>
      <div className="mb-group">
        <p className={contentPresentation.caption}>createZodValidator</p>
        <h2 className={classes("mb-related mt-related", contentPresentation.itemTitle)}>Validation boundary</h2>
        <p className={classes("m-0", contentPresentation.caption)}>
          Try fewer than 3 characters, then a padded valid title. Invalid commits preserve the last canonical JSON; Zod trim output is never adopted.
        </p>
      </div>

      <SelectableItem
        as="label"
        selected={title.getIsSelected()}
        focus={title.getIsFocus()}
        className={classes("grid gap-related p-related", contentPresentation.caption)}
      >
        Profile title draft
        <Field
          label="Profile title draft"
          value={draft}
          onValueChange={setDraft}
          onFocus={title.getPressHandler()}
        />
      </SelectableItem>
      <Command
        kind="primary"
        onClick={commitDraft}
        className="mt-related"
      >
        Commit draft
      </Command>

      <div className="mt-group grid gap-group lg:grid-cols-2">
        <JSONPanel label="Commit result" testId="zod-validation-result" value={result} />
        <JSONPanel label="Canonical JSON" testId="zod-document-json" value={value} />
      </div>
    </section>
  );
}

function JSONPanel(props: {
  readonly label: string;
  readonly testId: string;
  readonly value: unknown;
}) {
  return <Inspector label={`Inspect ${props.label}`} items={[
    { label: props.label, testId: props.testId, value: props.value },
  ]} />;
}
