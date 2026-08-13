import type { JSONValue } from "@interactive-os/json-document";
import type { EditingResult } from "./session.js";

/** Product sentence before it becomes a plan or patch. `type` is the verb. */
export interface EditingIntent {
  readonly type: string;
}

/** Shared editing-layer door. Domain editors keep their own intent unions. */
export interface EditingDispatch<Intent extends EditingIntent, Selection extends JSONValue> {
  dispatch(intent: Intent): EditingResult<Selection>;
}
