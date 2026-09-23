import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createJSONDocument, type JSONDocument } from "@interactive-os/json-document";
import { createEditingSession } from "@interactive-os/json-document-editing";
import { createFormControl } from "react-hook-form";
import { useReactConnector } from "@interactive-os/json-document-react";
import { createZodValidator } from "@interactive-os/json-document-zod";
import * as z from "zod/v4";

import { useJSONDocumentForm, useReactHookFormConnector } from "../src/index.js";

interface ProfileForm {
  profile: {
    title: string;
    role: string;
  };
}

afterEach(cleanup);

describe("React Hook Form Connector", () => {
  test("does not clone an unchanged snapshot on rerender or selection updates", () => {
    const document = createJSONDocument({ items: Array.from({ length: 10_000 }, (_, id) => ({ id })) });
    const session = createEditingSession({ document, selection: null });
    const hook = renderHook(() => useJSONDocumentForm(session));
    const stringify = vi.spyOn(JSON, "stringify");
    try {
      for (let index = 0; index < 10; index++) hook.rerender();
      act(() => { session.select(null); });
      expect(stringify.mock.calls.filter(([value]) => value === document.value)).toHaveLength(0);
      act(() => { hook.result.current.form.setValue("items.0.id", 99); });
      expect(document.at("/items/0/id")).toMatchObject({ value: 0 });
    } finally { stringify.mockRestore(); }
  });

  test("initializes replaced form controls and follows session/document replacement", () => {
    const first = createProfileDocument();
    const second = createJSONDocument({ profile: { title: "Second", role: "editor" } });
    const controls = [createFormControl<ProfileForm>().formControl, createFormControl<ProfileForm>().formControl];
    const hook = renderHook(({ document, formControl }) => useReactHookFormConnector<ProfileForm>(document, {
      form: { formControl },
    }), { initialProps: { document: first, formControl: controls[0]! } });
    act(() => { hook.result.current.form.setValue("profile.title", "Local"); });
    hook.rerender({ document: first, formControl: controls[0]! });
    expect(hook.result.current.form.getValues("profile.title")).toBe("Local");
    hook.rerender({ document: first, formControl: controls[1]! });
    expect(hook.result.current.form.getValues("profile.title")).toBe("Draft");
    hook.rerender({ document: second, formControl: controls[1]! });
    expect(hook.result.current.form.getValues()).toEqual(second.value);
    act(() => { first.commit([{ op: "replace", path: "/profile/title", value: "Old source" }]); });
    expect(hook.result.current.form.getValues("profile.title")).toBe("Second");
  });

  test("deduplicates a large pointer batch and retains unrelated drafts", () => {
    const document = createJSONDocument({
      fields: Object.fromEntries(Array.from({ length: 1_000 }, (_, index) => [`field${index}`, 0])),
      draft: "original",
    });
    const session = createEditingSession({ document, selection: null });
    const source = { at: vi.fn(document.at), subscribe: document.subscribe };
    const hook = renderHook(() => useJSONDocumentForm(session, {}, source));
    act(() => { hook.result.current.form.setValue("draft", "local"); });
    const some = vi.spyOn(Array.prototype, "some");
    try {
      act(() => {
        document.commit(Array.from({ length: 2_000 }, (_, index) => ({
          op: "replace" as const, path: `/fields/field${index % 1_000}`, value: index,
        })));
      });
      expect(some.mock.contexts.filter((value) => (
        Array.isArray(value) && value.length > 100 && typeof value[0] === "string" && value[0].startsWith("/fields/")
      ))).toHaveLength(0);
    } finally { some.mockRestore(); }
    expect(source.at).toHaveBeenCalledTimes(1_000);
    expect(hook.result.current.form.getValues("fields.field999")).toBe(1_999);
    expect(hook.result.current.form.getValues("draft")).toBe("local");
  });

  test("syncs ancestors, structural move/copy parents and escaped/root fallbacks", () => {
    const document = createJSONDocument({ left: [{ n: 1 }], right: [{ n: 2 }], draft: "original", "a/b": { n: 0 } });
    const session = createEditingSession({ document, selection: null });
    const source = { at: vi.fn(document.at), subscribe: document.subscribe };
    const hook = renderHook(() => useJSONDocumentForm(session, {}, source));
    act(() => { hook.result.current.form.setValue("draft", "local"); });
    act(() => {
      document.commit([
        { op: "replace", path: "/left/0/n", value: 3 },
        { op: "move", from: "/left/0", path: "/right/1" },
        { op: "copy", from: "/right/0", path: "/left/0" },
      ]);
    });
    expect(source.at.mock.calls.map(([path]) => path)).toEqual(["/right", "/left"]);
    expect(hook.result.current.form.getValues("right")).toEqual([{ n: 2 }, { n: 3 }]);
    expect(hook.result.current.form.getValues("draft")).toBe("local");
    act(() => { document.commit([{ op: "replace", path: "/a~1b/n", value: 4 }]); });
    expect(hook.result.current.form.getValues()).toEqual(document.value);
    source.at.mockClear();
    act(() => { document.commit([{ op: "replace", path: "", value: { title: "root" } }]); });
    expect(source.at).not.toHaveBeenCalled();
    expect(hook.result.current.form.getValues()).toEqual({ title: "root" });
  });

  test("keeps JSON conversion for Date and omitted optional values in form payloads", async () => {
    const document = createJSONDocument({ rows: [] });
    const hook = renderHook(() => useReactHookFormConnector<{ rows: Array<{ date: Date; optional?: string | undefined }> }>(document));
    act(() => {
      hook.result.current.form.setValue("rows", [{ date: new Date("2026-01-01T00:00:00Z"), optional: undefined }]);
    });
    await act(async () => { await hook.result.current.submit(); });
    expect(hook.result.current.result).toMatchObject({ ok: true });
    expect(document.value).toEqual({ rows: [{ date: "2026-01-01T00:00:00.000Z" }] });
  });

  test("keeps drafts local, then commits all submitted fields as one history entry", async () => {
    const document = createProfileDocument();
    render(<ProfileEditor document={document} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Published" } });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "admin" } });

    expect(document.value).toEqual(initialProfile);
    expect(screen.getByTestId("dirty").textContent).toBe("dirty");

    fireEvent.submit(screen.getByRole("form", { name: "Profile" }));

    await waitFor(() => {
      expect(document.value).toEqual({
        profile: { title: "Published", role: "admin" },
      });
    });
    expect(screen.getByTestId("revision").textContent).toBe("1");
    expect(screen.getByTestId("canonical").textContent).toContain("Published");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveProperty("value", "Draft");
      expect(screen.getByLabelText("Role")).toHaveProperty("value", "viewer");
    });
    expect(screen.getByTestId("dirty").textContent).toBe("pristine");

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveProperty("value", "Published");
      expect(screen.getByLabelText("Role")).toHaveProperty("value", "admin");
    });
    expect(screen.getByTestId("dirty").textContent).toBe("pristine");
  });

  test("maps rejected canonical validation to a host-selected field without recording history", async () => {
    const document = createProfileDocument();
    render(<ProfileEditor document={document} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x" } });
    fireEvent.submit(screen.getByRole("form", { name: "Profile" }));

    expect(await screen.findByText("Title must contain at least 3 characters.")).toBeTruthy();
    expect(document.value).toEqual(initialProfile);
    expect(screen.getByTestId("revision").textContent).toBe("0");
  });

  test("resets only the externally changed field while preserving unrelated drafts", async () => {
    const document = createProfileDocument();
    render(<ProfileEditor document={document} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x" } });
    fireEvent.blur(screen.getByLabelText("Title"));
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "local-role" } });
    fireEvent.blur(screen.getByLabelText("Role"));
    fireEvent.submit(screen.getByRole("form", { name: "Profile" }));
    expect(await screen.findByText("Title must contain at least 3 characters.")).toBeTruthy();

    act(() => {
      document.commit([{ op: "replace", path: "/profile/title", value: "External" }]);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveProperty("value", "External");
      expect(screen.getByLabelText("Role")).toHaveProperty("value", "local-role");
      expect(screen.queryByText("Title must contain at least 3 characters.")).toBeNull();
    });
    expect(screen.getByTestId("dirty").textContent).toBe("dirty");
    expect(screen.getByTestId("touched").textContent).toBe("untouched");
    expect(screen.getByTestId("role-touched").textContent).toBe("touched");
  });
});

const initialProfile = {
  profile: { title: "Draft", role: "viewer" },
} as const;

function createProfileDocument() {
  return createJSONDocument(initialProfile, {
    validate: createZodValidator(z.object({
      profile: z.object({
        title: z.string().min(3, "Title must contain at least 3 characters."),
        role: z.string(),
      }),
    })),
  });
}

function ProfileEditor({ document }: { readonly document: JSONDocument }) {
  const binding = useReactHookFormConnector<ProfileForm>(document, {
    errorName: (failure) => failure.pointer === "/profile/title"
      ? "profile.title"
      : "root.canonical",
  });
  const canonical = useReactConnector(document);
  const { register, formState } = binding.form;

  return (
    <form aria-label="Profile" onSubmit={binding.submit}>
      <label>Title<input {...register("profile.title")} /></label>
      {formState.errors.profile?.title?.message && <p>{formState.errors.profile.title.message}</p>}
      <label>Role<input {...register("profile.role")} /></label>
      <output data-testid="dirty">{formState.isDirty ? "dirty" : "pristine"}</output>
      <output data-testid="touched">{formState.touchedFields.profile?.title ? "touched" : "untouched"}</output>
      <output data-testid="role-touched">{formState.touchedFields.profile?.role ? "touched" : "untouched"}</output>
      <output data-testid="revision">{binding.snapshot.revision}</output>
      <output data-testid="canonical">{JSON.stringify(canonical)}</output>
      <button type="submit">Save</button>
      <button type="button" onClick={binding.undo}>Undo</button>
      <button type="button" onClick={binding.redo}>Redo</button>
    </form>
  );
}
