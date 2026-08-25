import { createRichTextSchema } from "@interactive-os/json-document-rich-text";
import { COMPOSER_MENTION_NODE, COMPOSER_PROFILE_V1, COMPOSER_SKILL_NODE } from "./model.js";

const referenceAttrs = {
  label: { required: true, validate: (value: unknown) => typeof value === "string" && value.length > 0 },
} as const;

export const composerSchema = createRichTextSchema({
  profile: COMPOSER_PROFILE_V1,
  nodes: {
    [COMPOSER_MENTION_NODE]: { group: "inline", atom: true, content: null, allowedMarks: "none", attrs: { entityId: { required: true, validate: referenceAttrs.label.validate }, ...referenceAttrs } },
    [COMPOSER_SKILL_NODE]: { group: "inline", atom: true, content: null, allowedMarks: "none", attrs: { skillId: { required: true, validate: referenceAttrs.label.validate }, ...referenceAttrs } },
  },
});
