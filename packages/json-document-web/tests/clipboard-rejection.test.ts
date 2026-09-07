import { describe, expect, it, vi } from "vitest";
import { createWebClipboardBinding, documentClipboardCodec } from "../src/index.js";

describe("clipboard event ownership", () => {
  const payload = { type: "application/vnd.interactive-os.blocks+json" as const, blocks: [{ id: "a", text: "A" }], text: "A" };
  it.each(["cut", "paste"] as const)("cancels a supported %s before a rejected edit", (operation) => {
    const preventDefault = vi.fn();
    const reject = () => {
      expect(preventDefault).toHaveBeenCalledOnce();
      return { ok: false, code: "permission-denied" };
    };
    const binding = createWebClipboardBinding({ codec: documentClipboardCodec, read: () => payload, cut: reject, paste: reject });
    const result = binding[operation]({
      clipboardData: { types: [payload.type], getData: () => JSON.stringify(payload), setData() {} },
      preventDefault,
    });
    expect(result).toMatchObject({ ok: false, code: "editing.rejected" });
    expect(preventDefault).toHaveBeenCalledOnce();
  });
  it("leaves unsupported paste formats to their owner", () => {
    const preventDefault = vi.fn();
    const paste = vi.fn(() => ({ ok: true }));
    const binding = createWebClipboardBinding({ codec: documentClipboardCodec, read: () => payload, paste });
    expect(binding.paste({ clipboardData: { types: ["image/png"], getData: () => "", setData() {} }, preventDefault }).ok).toBe(false);
    expect(paste).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
