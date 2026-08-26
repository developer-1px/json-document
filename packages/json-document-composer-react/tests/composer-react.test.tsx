import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { COMPOSER_HOST_PROFILE_V1, type ComposerDraft, type ComposerHostConfig } from "@interactive-os/json-document-composer";
import { ComposerReferenceAtom, useComposer } from "../src/index.js";

afterEach(cleanup);

describe("Composer React integration", () => {
  test("projects canonical mention and skill atoms without product styling", () => {
    render(<>
      <ComposerReferenceAtom node={{ id: "mention", type: "os.interactive/mention", attrs: { entityId: "alpha", label: "Alpha" } }} className="product-atom" />
      <ComposerReferenceAtom node={{ id: "skill", type: "os.interactive/skill", attrs: { skillId: "summary", label: "Summary" } }} />
    </>);
    const mention = screen.getByText("Alpha").closest<HTMLElement>("[data-rich-text-mention]")!;
    expect(mention.dataset).toMatchObject({ composerReferenceKind: "mention", richTextNodeId: "mention" });
    expect(mention.className).toBe("product-atom");
    expect(screen.getByText("/Summary").dataset.composerReferenceKind).toBe("skill");
  });

  test("preserves canonical lifecycle when Hosts replace config values and ports", () => {
    const enterSubmit = vi.fn(async () => undefined);
    const modSubmit = vi.fn(async () => undefined);
    render(<>
      <ComposerHostHarness host="enter" config={hostConfig("Fast", "enter")} submit={enterSubmit} />
      <ComposerHostHarness host="mod" config={hostConfig("Deep", "mod-enter")} submit={modSubmit} />
    </>);

    fireEvent.click(screen.getByRole("button", { name: "enter-text" }));
    fireEvent.click(screen.getByRole("button", { name: "mod-text" }));
    expect(screen.getByTestId("enter-draft").textContent).toContain("Fast");
    expect(screen.getByTestId("mod-draft").textContent).toContain("Deep");

    fireEvent.keyDown(screen.getByTestId("enter-keyboard"), { key: "Enter" });
    fireEvent.keyDown(screen.getByTestId("mod-keyboard"), { key: "Enter" });
    expect(enterSubmit).toHaveBeenCalledTimes(1);
    expect(modSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByTestId("mod-keyboard"), { key: "Enter", ctrlKey: true });
    expect(modSubmit).toHaveBeenCalledTimes(1);
  });
});

function hostConfig<Model extends string>(model: Model, submit: "enter" | "mod-enter"): ComposerHostConfig<Model> {
  return {
    profile: COMPOSER_HOST_PROFILE_V1,
    models: [{ id: model.toLocaleLowerCase(), label: model, value: model, description: `${model} provider` }],
    suggestions: [{ id: "summary", kind: "skill", label: "Summary", description: "Summarize", iconText: "/" }],
    attachments: { acceptedMediaTypes: ["*/*"], maxFiles: null, maxBytesPerFile: null },
    interaction: { submit, newline: submit === "enter" ? "shift-enter" : "enter" },
  };
}

function ComposerHostHarness<Model extends string>(props: { readonly host: string; readonly config: ComposerHostConfig<Model>; readonly submit: (draft: ComposerDraft<Model>) => Promise<void> }) {
  let id = 0;
  const composer = useComposer({
    id: props.host,
    config: props.config,
    ports: { createId: () => `${props.host}-${++id}`, submit: props.submit },
    labels: { mentionSuggestions: `${props.host} mentions`, skillSuggestions: `${props.host} skills` },
  });
  return <div data-testid={`${props.host}-keyboard`} onKeyDown={composer.handleKeyDown}>
    <button aria-label={`${props.host}-text`} onClick={() => composer.insertText("hello")}>text</button>
    <output data-testid={`${props.host}-draft`}>{JSON.stringify(composer.document.value)}</output>
  </div>;
}
