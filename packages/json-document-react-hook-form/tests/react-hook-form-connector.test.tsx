import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { createJSONDocument, type JSONDocument } from "@interactive-os/json-document";
import { useReactConnector } from "@interactive-os/json-document-react";
import { createZodValidator } from "@interactive-os/json-document-zod";
import * as z from "zod/v4";

import { useReactHookFormConnector } from "../src/index.js";

interface ProfileForm {
  profile: {
    title: string;
    role: string;
  };
}

afterEach(cleanup);

describe("React Hook Form connector", () => {
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

  test("resets dirty, touched, and errors after an external canonical commit", async () => {
    const document = createProfileDocument();
    render(<ProfileEditor document={document} />);

    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "x" } });
    fireEvent.blur(screen.getByLabelText("Title"));
    fireEvent.submit(screen.getByRole("form", { name: "Profile" }));
    expect(await screen.findByText("Title must contain at least 3 characters.")).toBeTruthy();

    act(() => {
      document.commit([{ op: "replace", path: "/profile/title", value: "External" }]);
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
      <output data-testid="revision">{binding.snapshot.revision}</output>
      <output data-testid="canonical">{JSON.stringify(canonical)}</output>
      <button type="submit">Save</button>
      <button type="button" onClick={binding.undo}>Undo</button>
      <button type="button" onClick={binding.redo}>Redo</button>
    </form>
  );
}
