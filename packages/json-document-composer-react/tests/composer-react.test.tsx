import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ComposerReferenceAtom } from "../src/index.js";

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
});
