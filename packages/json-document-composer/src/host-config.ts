import type { JSONValue } from "@interactive-os/json-document";
import type { FileAcceptancePolicy } from "@interactive-os/json-document-file-intake";
import type { ComposerReference } from "./model.js";

export const COMPOSER_HOST_PROFILE_V1 = "urn:interactive-os:json-document:composer-host:1" as const;

export interface ComposerHostModel<Model extends string = string> extends Record<string, JSONValue> {
  readonly id: string;
  readonly label: string;
  readonly value: Model;
}

export type ComposerHostSuggestion = ComposerReference & Readonly<Record<string, JSONValue>>;

export type ComposerAttachmentPolicy = FileAcceptancePolicy;

export interface ComposerInteractionPolicy extends Record<string, JSONValue> {
  readonly submit: "enter" | "mod-enter";
  readonly newline: "shift-enter" | "enter";
}

export interface ComposerHostConfig<Model extends string = string> extends Record<string, JSONValue> {
  readonly profile: typeof COMPOSER_HOST_PROFILE_V1;
  readonly models: ReadonlyArray<ComposerHostModel<Model>>;
  readonly suggestions: ReadonlyArray<ComposerHostSuggestion>;
  readonly attachments: ComposerAttachmentPolicy;
  readonly interaction: ComposerInteractionPolicy;
}

export interface ComposerHostPorts<Model extends string = string> {
  readonly createId: () => string;
  readonly submit: (draft: import("./model.js").ComposerDraft<Model>) => Promise<void>;
}

/** JSON Schema for the serializable product policy that configures a Composer. */
export const composerHostConfigSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: COMPOSER_HOST_PROFILE_V1,
  type: "object",
  additionalProperties: false,
  required: ["profile", "models", "suggestions", "attachments", "interaction"],
  properties: {
    profile: { const: COMPOSER_HOST_PROFILE_V1 },
    models: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "value"],
        properties: { id: { type: "string", minLength: 1 }, label: { type: "string", minLength: 1 }, value: { type: "string", minLength: 1 } },
      },
    },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "kind", "label"],
        properties: { id: { type: "string", minLength: 1 }, kind: { enum: ["mention", "skill"] }, label: { type: "string", minLength: 1 } },
      },
    },
    attachments: {
      type: "object",
      additionalProperties: false,
      required: ["acceptedMediaTypes", "maxFiles", "maxBytesPerFile"],
      properties: {
        acceptedMediaTypes: { type: "array", items: { type: "string", minLength: 1 } },
        maxFiles: { type: ["integer", "null"], minimum: 1 },
        maxBytesPerFile: { type: ["integer", "null"], minimum: 1 },
      },
    },
    interaction: {
      type: "object",
      additionalProperties: false,
      required: ["submit", "newline"],
      properties: { submit: { enum: ["enter", "mod-enter"] }, newline: { enum: ["shift-enter", "enter"] } },
    },
  },
} as const;
