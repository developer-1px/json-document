import { expect, it } from "vitest";
import { createAnnotationReviewPlanTool } from "../src/annotation-review-plan.js";
it("rejects fabricated and missing target IDs before handing a plan to execution", () => {
  const plan = createAnnotationReviewPlanTool(["title"]);
  expect(plan.tool.execute({ instruction: 'fix', reply: 'reply', targetNodeIds: ['missing'] }).ok).toBe(false);
  expect(plan.tool.execute({ instruction: 'fix', reply: 'reply' }).ok).toBe(false);
  expect(() => plan.read()).toThrow();
  expect(plan.tool.execute({ instruction: 'fix', reply: 'reply', targetNodeIds: ['title'] }).ok).toBe(true);
  expect(plan.read().targetNodeIds).toEqual(['title']);
});
