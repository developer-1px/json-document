import { useState } from "react";
import { createJSONDocument } from "@interactive-os/json-document";
import { useReactConnector } from "@interactive-os/json-document-react";
import { useReactHookFormConnector } from "@interactive-os/json-document-react-hook-form";
import { createZodValidator } from "@interactive-os/json-document-zod";
import * as z from "zod/v4";
import { JsonInspector } from "../../../shared/ui/json-inspector";
import { Button } from "../../../shared/ui/primitives";
import { classes, ui } from "../../../shared/ui/styles";

type ProfileForm = {
  profile: {
    name: string;
    role: "Viewer" | "Editor" | "Admin";
    active: boolean;
  };
};

const profileSchema = z.object({
  profile: z.object({
    name: z.string().trim().min(3, "Name must contain at least 3 characters."),
    role: z.enum(["Viewer", "Editor", "Admin"]),
    active: z.boolean(),
  }),
});

function createProfileDocument() {
  return createJSONDocument({
    profile: { name: "Ada Lovelace", role: "Admin", active: true },
  }, { validate: createZodValidator(profileSchema) });
}

export function ReactHookFormConnectorLab() {
  const [document] = useState(createProfileDocument);
  const binding = useReactHookFormConnector<ProfileForm>(document, {
    errorName: (failure) => failure.pointer === "/profile/name"
      ? "profile.name"
      : "root.canonical",
  });
  const snapshot = binding.snapshot;
  const canonical = useReactConnector(document);
  const { register, formState } = binding.form;

  return (
    <section aria-label="React Hook Form lifecycle" className={classes("p-4", ui.surface.raised)}>
      <div className="mb-4">
        <p className={ui.text.label}>Record Detail · same canonical JSON</p>
        <h2 className={classes("mb-1 mt-1", ui.text.heading)}>Draft locally, commit atomically</h2>
        <p className={classes("m-0", ui.text.meta)}>
          Change several fields. The draft stays in React Hook Form until Save; one valid submit becomes one undo step.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(20rem,1.2fr)]">
        <form aria-label="Record detail" onSubmit={binding.submit} className="grid content-start gap-4">
          <label className={classes("grid gap-1", ui.text.meta)}>
            Name
            <input aria-invalid={Boolean(formState.errors.profile?.name)} className={ui.field.control} {...register("profile.name")} />
            {formState.errors.profile?.name?.message && (
              <span role="alert" className={ui.state.error}>{formState.errors.profile.name.message}</span>
            )}
          </label>
          <label className={classes("grid gap-1", ui.text.meta)}>
            Role
            <select className={ui.field.control} {...register("profile.role")}>
              <option>Viewer</option><option>Editor</option><option>Admin</option>
            </select>
          </label>
          <label className={classes("flex items-center gap-2", ui.text.meta)}>
            <input type="checkbox" {...register("profile.active")} /> Active
          </label>

          <div className="flex flex-wrap gap-2">
            <Button kind="primary" type="submit">Save record</Button>
            <Button type="button" disabled={!snapshot.canUndo} onClick={binding.undo}>Undo</Button>
            <Button type="button" disabled={!snapshot.canRedo} onClick={binding.redo}>Redo</Button>
          </div>

          <dl className={classes("grid grid-cols-2 gap-2 p-3", ui.surface.inset)}>
            <Status label="Draft" value={formState.isDirty ? "dirty" : "pristine"} testId="rhf-dirty" />
            <Status label="Revision" value={String(snapshot.revision)} testId="rhf-revision" />
            <Status label="Touched" value={Object.keys(formState.touchedFields.profile ?? {}).length ? "yes" : "no"} />
            <Status label="History" value={`${snapshot.canUndo ? "undo" : "—"} / ${snapshot.canRedo ? "redo" : "—"}`} />
          </dl>
        </form>

        <div className="grid content-start gap-4">
          <JsonInspector label="Canonical JSON" testId="rhf-canonical-json" value={canonical} />
          <JsonInspector label="Last submit result" testId="rhf-submit-result" value={binding.result ?? { status: "not submitted" }} />
        </div>
      </div>
    </section>
  );
}

function Status(props: { readonly label: string; readonly value: string; readonly testId?: string }) {
  return (
    <div>
      <dt className={ui.text.label}>{props.label}</dt>
      <dd className="m-0" data-testid={props.testId}>{props.value}</dd>
    </div>
  );
}
