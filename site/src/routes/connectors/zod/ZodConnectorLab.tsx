import { useState } from "react";
import { createJSONDocument, type JSONPatchValidationResult } from "@interactive-os/json-document";
import { useJSONDocumentValue } from "@interactive-os/json-document-react";
import { createZodValidator } from "@interactive-os/json-document-zod";
import * as z from "zod/v4";

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
    <section aria-label="Zod validation" className="rounded border border-stone-200 bg-white p-4">
      <div className="mb-4">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-stone-400">createZodValidator</p>
        <h2 className="mb-1 mt-1 text-base font-semibold text-stone-950">Validation boundary</h2>
        <p className="m-0 text-xs leading-5 text-stone-500">
          Try fewer than 3 characters, then a padded valid title. Invalid commits preserve the last canonical JSON; Zod trim output is never adopted.
        </p>
      </div>

      <label className="grid gap-1 text-xs font-medium text-stone-600">
        Profile title draft
        <input
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          className="rounded border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-900"
        />
      </label>
      <button
        type="button"
        onClick={commitDraft}
        className="mt-3 rounded bg-stone-950 px-3 py-2 text-xs font-medium text-white hover:bg-stone-800"
      >
        Commit draft
      </button>

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
    <div className="rounded border border-stone-800 bg-stone-950 p-3 text-stone-100">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500">{props.label}</div>
      <pre data-testid={props.testId} className="m-0 min-h-24 overflow-auto whitespace-pre-wrap text-xs leading-5">
        <code>{JSON.stringify(props.value, null, 2)}</code>
      </pre>
    </div>
  );
}
