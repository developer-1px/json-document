import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { createJSONDocument } from "@interactive-os/json-document";
import { createEditingSession } from "@interactive-os/json-document-editing";
import { createZodValidator } from "@interactive-os/json-document-zod";
import * as z from "zod/v4";

import { useJSONDocumentForm } from "../src/index.js";

interface ProfileForm {
  profile: {
    title: string;
    role: string;
  };
}

type FormSelection = { readonly kind: "form" };

afterEach(cleanup);

describe("React Hook Form connector", () => {
  test("keeps drafts local, then commits all submitted fields as one history entry", async () => {
    const session = createProfileSession();
    render(<ProfileEditor session={session} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Published" } });
    fireEvent.change(screen.getByLabelText("Role"), { target: { value: "admin" } });

    expect(session.snapshot.value).toEqual(initialProfile);
    expect(screen.getByTestId("dirty").textContent).toBe("dirty");

    fireEvent.submit(screen.getByRole("form", { name: "Profile" }));

    await waitFor(() => {
      expect(session.snapshot.value).toEqual({
        profile: { title: "Published", role: "admin" },
      });
    });
    expect(session.snapshot.revision).toBe(1);
    expect(session.snapshot.canUndo).toBe(true);

    act(() => { session.undo(); });
    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveProperty("value", "Draft");
      expect(screen.getByLabelText("Role")).toHaveProperty("value", "viewer");
    });
    expect(screen.getByTestId("dirty").textContent).toBe("pristine");

    act(() => { session.redo(); });
    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveProperty("value", "Published");
      expect(screen.getByLabelText("Role")).toHaveProperty("value", "admin");
    });
    expect(screen.getByTestId("dirty").textContent).toBe("pristine");
  });

  test("maps rejected canonical validation to a host-selected field without recording history", async () => {
    const session = createProfileSession();
    render(<ProfileEditor session={session} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x" } });
    fireEvent.submit(screen.getByRole("form", { name: "Profile" }));

    expect(await screen.findByText("Title must contain at least 3 characters.")).toBeTruthy();
    expect(session.snapshot.value).toEqual(initialProfile);
    expect(session.snapshot.revision).toBe(0);
    expect(session.snapshot.canUndo).toBe(false);
  });

  test("resets dirty, touched, and errors after an external canonical commit", async () => {
    const session = createProfileSession();
    render(<ProfileEditor session={session} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x" } });
    fireEvent.blur(screen.getByLabelText("Title"));
    fireEvent.submit(screen.getByRole("form", { name: "Profile" }));
    expect(await screen.findByText("Title must contain at least 3 characters.")).toBeTruthy();

    act(() => {
      session.apply({
        operations: [{ op: "replace", path: "/profile/title", value: "External" }],
        selectionAfter: { kind: "form" },
        origin: "external.sync",
        history: "ignore",
      });
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveProperty("value", "External");
      expect(screen.queryByText("Title must contain at least 3 characters.")).toBeNull();
    });
    expect(screen.getByTestId("dirty").textContent).toBe("pristine");
    expect(screen.getByTestId("touched").textContent).toBe("untouched");
  });
});

const initialProfile = {
  profile: { title: "Draft", role: "viewer" },
} as const;

function createProfileSession() {
  const document = createJSONDocument(initialProfile, {
    validate: createZodValidator(z.object({
      profile: z.object({
        title: z.string().min(3, "Title must contain at least 3 characters."),
        role: z.string(),
      }),
    })),
  });
  return createEditingSession<FormSelection>({ document, selection: { kind: "form" } });
}

function ProfileEditor({ session }: { readonly session: ReturnType<typeof createProfileSession> }) {
  const binding = useJSONDocumentForm<ProfileForm, FormSelection>(session, {
    errorName: (failure) => failure.pointer === "/profile/title"
      ? "profile.title"
      : "root.canonical",
  });
  const { register, formState } = binding.form;

  return (
    <form aria-label="Profile" onSubmit={binding.submit}>
      <label>Title<input {...register("profile.title")} /></label>
      {formState.errors.profile?.title?.message && <p>{formState.errors.profile.title.message}</p>}
      <label>Role<input {...register("profile.role")} /></label>
      <output data-testid="dirty">{formState.isDirty ? "dirty" : "pristine"}</output>
      <output data-testid="touched">{formState.touchedFields.profile?.title ? "touched" : "untouched"}</output>
      <button type="submit">Save</button>
    </form>
  );
}
