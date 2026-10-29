/** The coordinator delegates an actionable plan; it cannot directly modify a document. */
export function createAnnotationReviewPlanTool(availableNodeIds?: readonly string[]) {
  let plan: { instruction: string; reply: string; targetNodeIds: string[] } | null = null;
  return {
    tool: {
      name: "queue_review",
      description: "수정할 내용을 사용자에게 설명하고 실행 에이전트에게 맡길 계획을 확정합니다. 문서를 직접 수정하지 않습니다.",
      parameters: { type: "object", properties: { targetNodeIds: { type: "array", items: { type: "string" }, description: "실제로 수정할 요소의 data-node-id. 대상이 불명확하면 계획을 확정하지 마세요." }, instruction: { type: "string", description: "실행 에이전트의 구체적인 수정 지시" }, reply: { type: "string", description: "사용자에게 어떻게 수정할지 설명하는 짧은 한국어 답변" } }, required: availableNodeIds ? ["instruction", "reply", "targetNodeIds"] : ["instruction", "reply"], additionalProperties: false },
      execute(args: unknown) {
        if (!args || typeof args !== "object" || !("instruction" in args) || !("reply" in args) || typeof args.instruction !== "string" || !args.instruction.trim() || typeof args.reply !== "string" || !args.reply.trim()) return { ok: false, code: "review.invalid-plan" };
        const targetNodeIds = "targetNodeIds" in args ? args.targetNodeIds : [];
        if (!Array.isArray(targetNodeIds) || targetNodeIds.some(id => typeof id !== "string" || (availableNodeIds && !availableNodeIds.includes(id))) || (availableNodeIds && !targetNodeIds.length)) return { ok: false, code: "review.invalid-target", availableNodeIds };
        plan = { targetNodeIds: [...new Set(targetNodeIds)], instruction: args.instruction.trim(), reply: args.reply.trim() };
        return { ok: true, status: "planned" };
      },
    },
    read() { if (!plan) throw Error("에이전트가 실행 계획을 만들지 않았습니다. 요청을 확인하고 다시 시도해 주세요."); return plan; },
  };
}
