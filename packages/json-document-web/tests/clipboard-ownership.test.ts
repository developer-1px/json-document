// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createWebClipboardSurface, documentClipboardCodec, routeWebClipboardEvent } from "../src/index.js";
afterEach(() => document.body.replaceChildren());
function setup(root: Element) {
  const payload = { type: documentClipboardCodec.mimeType, text: "A", blocks: [{ id: "a", text: "A" }] };
  const read = vi.fn<() => typeof payload | null>(() => payload);
  const cut = vi.fn(() => ({ ok: true }));
  const onResult = vi.fn();
  const surface = createWebClipboardSurface({ codec: documentClipboardCodec, read, cut, paste: () => ({ ok: true }), onResult });
  root.addEventListener("cut", (event) => surface.onCut(event as ClipboardEvent));
  return { payload, read, cut, onResult };
}
function cutEvent(target: Element, data: object | null = { types: [], getData: () => "", setData() {} }) {
  const event = new Event("cut", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", { value: data });
  target.dispatchEvent(event);
  return event;
}
describe("Clipboard event ownership", () => {
  it.each(['input', 'textarea', 'select', 'contenteditable', 'contenteditable-false'])("delegates nested %s without reading stale app selection", (kind) => {
    const root = document.createElement('div');
    const child = document.createElement(kind.startsWith('contenteditable') ? 'div' : kind);
    if (kind.startsWith('contenteditable')) child.setAttribute('contenteditable', kind.endsWith('false') ? 'false' : 'true');
    root.append(child); document.body.append(root);
    const owner = setup(root);
    expect(cutEvent(child).defaultPrevented).toBe(false);
    expect(owner.read).not.toHaveBeenCalled(); expect(owner.cut).not.toHaveBeenCalled(); expect(owner.onResult).not.toHaveBeenCalled();
  });
  it.each(['empty','unavailable','read-failed','write-failed'])("retains ownership for %s", (kind) => {
    const root = document.createElement('div'); document.body.append(root);
    const owner = setup(root);
    if (kind === 'empty') owner.read.mockReturnValue(null);
    if (kind === 'read-failed') owner.read.mockImplementation(() => { throw Error('read failed'); });
    const event = cutEvent(root, kind === 'unavailable' ? null : { types: [], getData: () => '', setData() { if (kind === 'write-failed') throw Error('write failed'); } });
    expect(event.defaultPrevented).toBe(true); expect(owner.cut).not.toHaveBeenCalled();
    expect(owner.onResult).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
  it('does not repeat a child owner in its parent', () => {
    const parent = document.createElement('div'), child = document.createElement('div'); parent.append(child); document.body.append(parent);
    const first = setup(child), second = setup(parent);
    expect(cutEvent(child).defaultPrevented).toBe(true);
    expect(first.cut).toHaveBeenCalledOnce(); expect(first.cut).toHaveBeenCalledWith(first.payload);
    expect(second.read).not.toHaveBeenCalled(); expect(second.onResult).not.toHaveBeenCalled();
  });
  it('claims an owned but unsupported Cut without native deletion', () => {
    const root = document.createElement('div'); document.body.append(root);
    const surface = createWebClipboardSurface({ codec: documentClipboardCodec, read: () => null, paste: () => ({ ok: true }), onResult() {} });
    root.addEventListener('cut', e => surface.onCut(e as ClipboardEvent));
    expect(cutEvent(root).defaultPrevented).toBe(true);
  });
  it('supports SVG roots and rejects their nested native editor', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    const foreign = document.createElementNS(svg.namespaceURI,'foreignObject'); const input = document.createElement('textarea');
    svg.append(foreign); foreign.append(input); document.body.append(svg);
    const owner = setup(svg); expect(cutEvent(input).defaultPrevented).toBe(false); expect(owner.read).not.toHaveBeenCalled();
    expect(cutEvent(svg).defaultPrevented).toBe(true); expect(owner.cut).toHaveBeenCalledOnce();
  });
  it('claims before caller preparation, including preparation exceptions', () => {
    const root=document.createElement('div'); document.body.append(root);
    const event={target:root,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
    expect(() => routeWebClipboardEvent(root,event,'cut',()=>{expect(event.defaultPrevented).toBe(true);throw Error('preparation');})).toThrow('preparation');
    expect(event.defaultPrevented).toBe(true);
  });
});
