import type { UIBuilderSkillDefinition } from "@interactive-os/json-document-editing";
import { briefingMockSkills } from "./briefing-example";

/** Fixture policy: use the existing mock capabilities with this product's status vocabulary. */
export const issueFeedMockSkills: readonly UIBuilderSkillDefinition[] = briefingMockSkills.map(skill => ({
  ...skill,
  run: async context => {
    const result = await skill.run(context);
    return {...result, state: skill.id === "mock.brief" ? "진행" : skill.id === "mock.work" ? "검토" : skill.id === "mock.complete" ? "완료" : result.state ?? "대기"};
  },
}));
