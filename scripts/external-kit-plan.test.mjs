import assert from "node:assert/strict";
import test from "node:test";

import { createPlan } from "./ci-plan.mjs";

test("첫 kit package 변경은 외부 소비자 검증을 선택한다", () => {
  for (const directory of [
    "json-document",
    "json-document-selection",
    "json-document-editing",
    "json-document-web",
    "json-document-react",
    "json-document-zod",
    "json-document-database",
    "json-document-calendar",
  ]) {
    assert.equal(createPlan([`packages/${directory}/src/index.ts`]).externalKit, true, directory);
  }
});

test("Database Hand 밖의 독립 connector 변경은 외부 소비자 검증을 선택하지 않는다", () => {
  assert.equal(createPlan(["packages/json-document-ajv/src/index.ts"]).externalKit, false);
});
