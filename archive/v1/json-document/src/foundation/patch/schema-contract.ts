import type * as z from "zod";
import type {
  JSONPatchOperation,
  JSONResult,
} from "./contract.js";

export interface ApplyResult<S extends z.ZodTypeAny> {
  state: z.output<S>;
  result: JSONResult;
  applied: ReadonlyArray<JSONPatchOperation>;
}
