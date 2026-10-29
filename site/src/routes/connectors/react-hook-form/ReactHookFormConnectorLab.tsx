import { contentPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { fieldPresentation } from "@interactive-os/json-document-ui-primitives-react";
import { useState } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { createJSONDocument } from "@interactive-os/json-document";
import { useEditing, useReactConnector } from "@interactive-os/json-document-react";
import { useReactHookFormConnector } from "@interactive-os/json-document-react-hook-form";
import { historyAffordance } from "@interactive-os/json-document-affordance";
import { createZodValidator } from "@interactive-os/json-document-zod";
import * as z from "zod/v4";
import { Inspector } from "../../../shared/ui/inspector";
import { Command, FormField, SelectableItem } from "@interactive-os/json-document-ui-primitives-react";
import { classes } from "../../../shared/ui/styles";

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
  const commands = historyAffordance(snapshot).hand;
  const canonical = useReactConnector(document);
  const { register, formState } = binding.form;
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const editing = useEditing({
    selectedKeys: [
      focusKey,
      formState.errors.profile?.name ? "profile.name" : null,
    ].filter((key): key is string => key !== null),
    focusKey,
    onSelect: (key) => setFocusKey(key),
  });
  const nameField = register("profile.name");
  const roleField = register("profile.role");
  const activeField = register("profile.active");

  return (
    <section aria-label="React Hook Form lifecycle" className={"grid content-start gap-group p-group"}>
      <div className="grid gap-related">
        <p className={contentPresentation.caption}>Record Detail · same canonical JSON</p>
        <h2 className={contentPresentation.itemTitle}>Draft locally, commit atomically</h2>
        <p className={classes("m-0", contentPresentation.caption)}>
          Change several fields. The draft stays in React Hook Form until Save; one valid submit becomes one undo step.
        </p>
      </div>

      <div className="grid gap-group lg:grid-cols-[minmax(18rem,0.8fr)_minmax(20rem,1.2fr)]">
        <form aria-label="Record detail" onSubmit={binding.submit} className="grid content-start gap-group">
          <SelectableItem
            as="div"
            selected={editing.getItem("profile.name").getIsSelected()}
            focus={editing.getItem("profile.name").getIsFocus()}
            className={classes("grid gap-related p-related", contentPresentation.caption)}
          >
            <FormField label="Name" error={formState.errors.profile?.name?.message}>
              {control => <input {...control} {...nameField} className={fieldPresentation.standard} onFocus={editing.getItem("profile.name").getPressHandler()} />}
            </FormField>
          </SelectableItem>
          <SelectableItem
            as="div"
            selected={editing.getItem("profile.role").getIsSelected()}
            focus={editing.getItem("profile.role").getIsFocus()}
            className={classes("grid gap-related p-related", contentPresentation.caption)}
          >
            <FormField label="Role">
              {control => <select {...control} {...roleField} className={fieldPresentation.standard} onFocus={editing.getItem("profile.role").getPressHandler()}>
                <option>Viewer</option><option>Editor</option><option>Admin</option>
              </select>}
            </FormField>
          </SelectableItem>
          <SelectableItem
            as="label"
            selected={editing.getItem("profile.active").getIsSelected()}
            focus={editing.getItem("profile.active").getIsFocus()}
            className={classes("flex items-center gap-related p-related", contentPresentation.caption)}
          >
            <input
              type="checkbox"
              className={fieldPresentation.checkbox}
              {...activeField}
              onFocus={editing.getItem("profile.active").getPressHandler()}
            /> Active
          </SelectableItem>

          <div className="flex flex-wrap gap-related">
            <Command kind="primary" type="submit">Save record</Command>
            <Command label="Undo" disabled={commands.undo.disabled} onClick={binding.undo}><Undo2 aria-hidden="true" size={16} /></Command>
            <Command label="Redo" disabled={commands.redo.disabled} onClick={binding.redo}><Redo2 aria-hidden="true" size={16} /></Command>
          </div>

          <dl className={classes("grid grid-cols-2 gap-related p-related")}>
            <Status label="Draft" value={formState.isDirty ? "dirty" : "pristine"} testId="rhf-dirty" />
            <Status label="Revision" value={String(snapshot.revision)} testId="rhf-revision" />
            <Status label="Touched" value={Object.keys(formState.touchedFields.profile ?? {}).length ? "yes" : "no"} />
            <Status label="History" value={`${snapshot.canUndo ? "undo" : "—"} / ${snapshot.canRedo ? "redo" : "—"}`} />
          </dl>
        </form>

        <Inspector label="Inspect form binding" items={[
          { label: "Canonical JSON", testId: "rhf-canonical-json", value: canonical },
          { label: "Last submit result", testId: "rhf-submit-result", value: binding.result ?? { status: "not submitted" } },
        ]} />
      </div>
    </section>
  );
}

function Status(props: { readonly label: string; readonly value: string; readonly testId?: string }) {
  return (
    <div className="grid content-start gap-related">
      <dt className={contentPresentation.caption}>{props.label}</dt>
      <dd className="m-0" data-testid={props.testId}>{props.value}</dd>
    </div>
  );
}
