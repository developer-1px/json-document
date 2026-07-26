import type { PasteOptions } from "../../clipboard/paste.js";
import type { RekeyOptions } from "../../schema/mutation/rekey.js";
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

// insert 가 프리미티브, paste = insert + clipboard 출처 + provenance 정책 (#214/#219).
// rekey 는 provenance 정책이므로 paste 어휘다.
export interface JSONDocumentInsertOptions {
  /** Array payload 를 array target 에 여러 add op 로 펼친다. */
  spread?: boolean;
  /** Skip JSON-serializability validation when the caller already owns that boundary. */
  trustedPayload?: boolean;
  /** @deprecated paste 전용 어휘 — `JSONDocumentPasteOptions` 로 이동 (#214/#219). 2.0 에서 제거. */
  rekey?: RekeyOptions;
}

export interface JSONDocumentPasteOptions extends PasteOptions {}
