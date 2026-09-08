import {
  contentInteractionAffordance,
  type ContentInteractionInput,
} from "@interactive-os/json-document-affordance";

export type ContentInteractionAttributes = {
  readonly "data-ui-interaction": "content" | "drop-target" | "insertion";
  readonly "data-ui-interaction-phase": "rest" | "active" | "dragging";
  readonly "data-selected"?: "true" | "false";
  readonly "data-primary"?: "true";
  readonly "data-elevated"?: "true";
};

/** Projects the canonical content-interaction meaning to stable product CSS hooks. */
export function contentInteractionAttributes(
  input: ContentInteractionInput,
): ContentInteractionAttributes {
  const interaction = contentInteractionAffordance(input);
  return {
    "data-ui-interaction": interaction.role,
    "data-ui-interaction-phase": interaction.phase,
    ...(interaction.role === "content" ? { "data-selected": interaction.selected ? "true" : "false" } : {}),
    ...(interaction.primary ? { "data-primary": "true" as const } : {}),
    ...(interaction.elevated ? { "data-elevated": "true" as const } : {}),
  };
}

export type { ContentInteractionInput } from "@interactive-os/json-document-affordance";
