import { useState } from "react";
import { createJSONDocument, type JSONPatchValidationResult } from "@interactive-os/json-document";
import { useJSONDocumentValue } from "@interactive-os/json-document-react";
import { createZodValidator } from "@interactive-os/json-document-zod";
import * as z from "zod/v4";
import { Button } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

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
  const value = useJSONDocumentValue(document) as ProfileDocument;
  const [draft, setDraft] = useState(value.profile.title);
  const [result, setResult] = useState<JSONPatchValidationResult>(accepted);

  function commitDraft() {
    setResult(document.commit([
      { op: "replace", path: "/profile/title", value: draft },
    ]));
  }

  return (
    <section aria-label="Zod validation" className={classes("p-4", ui.surface.default)}>
      <div className="mb-4">
        <p className={ui.text.eyebrow}>createZodValidator</p>
        <h2 className={classes("mb-1 mt-1", ui.text.heading)}>Validation boundary</h2>
        <p className={classes("m-0", ui.text.meta)}>
          Try fewer than 3 characters, then a padded valid title. Invalid commits preserve the last canonical JSON; Zod trim output is never adopted.
        </p>
      </div>

      <label className={classes("grid gap-1", ui.text.meta)}>
        Profile title draft
        <input
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          className={ui.field.control}
        />
      </label>
      <Button
        kind="primary"
        onClick={commitDraft}
        className="mt-3"
      >
        Commit draft
      </Button>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
  return (
    <div className={ui.code.json}>
      <div className={classes("mb-2", ui.text.inverseMeta)}>{props.label}</div>
      <pre data-testid={props.testId} className="m-0 min-h-24 overflow-auto whitespace-pre-wrap">
        <code>{JSON.stringify(props.value, null, 2)}</code>
      </pre>
    </div>
  );
}
