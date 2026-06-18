import type { JSONCapabilityResult, JSONDocument, JSONDocumentEditResult, JSONDocumentInsertTarget, JSONDocumentPasteTarget, Pointer } from "@interactive-os/json-document";
import { canPasteSpecial, copyDiagnostics, copyInput, copyOptions, copyPayload, isReplaceTarget, pasteSpecialError } from "./plan.js";
import type { PasteSpecialAdapter, PasteSpecialApplyResult, PasteSpecialDiagnostic, PasteSpecialError, PasteSpecialInput, PasteSpecialPlan } from "./types.js";

export function pasteSpecial<TDocument>(
  doc: JSONDocument<TDocument>,
  adapter: PasteSpecialAdapter,
  input: PasteSpecialInput,
): PasteSpecialApplyResult<TDocument> {
  const plan = canPasteSpecial(doc, adapter, input);
  if (!plan.ok) return plan;
  if (!plan.capability.ok) return disabled(plan);

  const payload = copyPayload(plan.payload);
  const result = isReplaceTarget(plan.target)
    ? doc.replace(plan.target.replace, payload)
    : doc.insert(plan.target as JSONDocumentInsertTarget, payload, plan.options);
  if (!result.ok) return executionFailed(plan, result);

  return {
    ok: true,
    input: copyInput(plan.input),
    target: copyPayload(plan.target) as JSONDocumentPasteTarget,
    payload: copyPayload(plan.payload),
    options: copyOptions(plan.options),
    result,
    diagnostics: copyDiagnostics(plan.diagnostics),
  };
}

function disabled(plan: PasteSpecialPlan): PasteSpecialError {
  const capability = plan.capability as Exclude<JSONCapabilityResult, { ok: true }>;
  const options: {
    target: JSONDocumentPasteTarget;
    pointer?: Pointer;
    diagnostics: ReadonlyArray<PasteSpecialDiagnostic>;
    capability: Exclude<JSONCapabilityResult, { ok: true }>;
  } = {
    target: plan.target,
    diagnostics: plan.diagnostics,
    capability,
  };
  if (capability.pointer !== undefined) options.pointer = capability.pointer;
  return pasteSpecialError("disabled", capability.reason ?? "paste special is disabled", options);
}

function executionFailed(
  plan: PasteSpecialPlan,
  result: Exclude<JSONDocumentEditResult, { ok: true }>,
): PasteSpecialError {
  return pasteSpecialError("execution_failed", pasteFailureReason(result), {
    target: plan.target,
    diagnostics: plan.diagnostics,
    result,
  });
}

function pasteFailureReason(result: Exclude<JSONDocumentEditResult, { ok: true }>): string {
  if ("reason" in result && typeof result.reason === "string") return result.reason;
  if ("message" in result && typeof result.message === "string") return result.message;
  return "paste special execution failed";
}
