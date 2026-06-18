import type { PasteOptions } from "../../../domain/clipboard/paste.js";
import type { Pointer } from "../../../foundation/pointer/index.js";

type JSONDocumentPlacementTarget =
  | Pointer
  | { into: Pointer }
  | { before: Pointer }
  | { after: Pointer };

export type JSONDocumentInsertTarget = JSONDocumentPlacementTarget;

export type JSONDocumentMoveTarget = JSONDocumentPlacementTarget;

export type JSONDocumentPasteTarget =
  | JSONDocumentInsertTarget
  | { replace: Pointer };

export interface JSONDocumentInsertOptions extends PasteOptions {}

export interface JSONDocumentPasteOptions extends PasteOptions {}
