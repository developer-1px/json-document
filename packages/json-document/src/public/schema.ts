// Advanced schema inspection entrypoint.
// The core document facade exposes this capability as `doc.schema`.

export type {
  SchemaDescription,
  SchemaKind,
} from "../application/document/schema/description.js";
export type {
  SchemaErrorCode,
  SchemaErrorResult,
  SchemaPathMode,
} from "../application/document/schema/resolve.js";
export type {
  SchemaDescriptionResult,
  SchemaKindResult,
  SchemaQueryResult,
} from "../application/document/schema/query.js";
export type { SchemaState } from "../application/document/schema/state.js";
