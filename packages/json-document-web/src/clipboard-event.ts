import { isWebEditingHostTarget } from "./input.js";

/** Routes an event to its editing owner before preparing clipboard content. */
export function routeWebClipboardEvent<Result>(
  root: object,
  event: { readonly target?: object | null; readonly defaultPrevented?: boolean; preventDefault(): void },
  operation: "copy" | "cut" | "paste",
  handle: () => Result,
): Result | null {
  if (event.defaultPrevented || !isWebEditingHostTarget(root, event.target ?? null)) return null;
  if (operation === "cut") event.preventDefault();
  return handle();
}
