import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { createPlan } from "./ci-plan.mjs";

test("문서 변경은 문서·사이트와 최소 browser smoke만 선택한다", () => {
  const plan = createPlan(["docs/architecture.md"]);

  assert.equal(plan.full, false);
  assert.equal(plan.externalKit, false);
  assert.equal(plan.docs, true);
  assert.equal(plan.site, true);
  assert.deepEqual(plan.packageWorkspaces, []);
  assert.deepEqual(plan.browserSpecs, [
    "site/tests/browser/live-demo-docs.spec.ts",
    "site/tests/browser/site-shell.spec.ts",
  ]);
});

test("패키지 변경은 역방향 소비자와 관련 browser spec을 선택한다", () => {
  const plan = createPlan(["packages/json-document-zod/src/index.ts"]);

  assert.equal(plan.full, false);
  assert.deepEqual(plan.packageWorkspaces, [
    "@interactive-os/json-document-react-hook-form",
    "@interactive-os/json-document-zod",
    "@interactive-os/json-document-database",
  ]);
  assert.deepEqual(plan.browserSpecs, [
    "site/tests/browser/connectors/react-hook-form.spec.ts",
    "site/tests/browser/connectors/zod.spec.ts",
    "site/tests/browser/database-demo.spec.ts",
    "site/tests/browser/site-shell.spec.ts",
  ]);
});

test("기반 패키지 변경은 모든 역방향 소비자를 선택한다", () => {
  const plan = createPlan(["packages/json-document/src/index.ts"]);

  assert.equal(plan.full, false);
  assert.equal(plan.packageWorkspaces.length, 25);
  assert.equal(plan.standards, true);
  assert.equal(plan.externalKit, true);
  assert.deepEqual(plan.browserSpecs, ["site/tests/browser"]);
});

test("lockfile과 workflow 및 미분류 변경은 전체 검사로 승격한다", () => {
  for (const path of ["package-lock.json", ".github/workflows/pages.yml", "unknown.bin"]) {
    const plan = createPlan([path]);
    assert.equal(plan.full, true, path);
    assert.equal(plan.packageWorkspaces.length, 26, path);
    assert.deepEqual(plan.browserSpecs, ["site/tests/browser"], path);
  }
});

test("사이트 route는 대응 browser spec을 선택한다", () => {
  const plan = createPlan(["site/src/routes/connectors/ajv/AjvRoute.tsx"]);

  assert.equal(plan.full, false);
  assert.equal(plan.site, true);
  assert.deepEqual(plan.browserSpecs, [
    "site/tests/browser/connectors/ajv.spec.ts",
    "site/tests/browser/site-shell.spec.ts",
  ]);
});

test("사이트 공통 기반 변경은 package가 아니라 browser만 전체 검사한다", () => {
  const plan = createPlan(["site/src/shared/ui/Button.tsx"]);

  assert.equal(plan.full, false);
  assert.equal(plan.site, true);
  assert.deepEqual(plan.packageWorkspaces, []);
  assert.deepEqual(plan.browserSpecs, ["site/tests/browser"]);
});

test("사이트 단위 테스트 변경은 browser 전체 검사로 확대하지 않는다", () => {
  const plan = createPlan(["site/tests/unit/docs-route.test.tsx"]);

  assert.equal(plan.full, false);
  assert.equal(plan.site, true);
  assert.deepEqual(plan.browserSpecs, ["site/tests/browser/site-shell.spec.ts"]);
});

test("main 계획은 현재 전체 품질 검사를 요구한다", () => {
  const plan = createPlan([], { full: true });

  assert.equal(plan.full, true);
  assert.equal(plan.docs, true);
  assert.equal(plan.site, true);
  assert.equal(plan.standards, true);
  assert.equal(plan.externalKit, true);
  assert.equal(plan.packageWorkspaces.length, 26);
  assert.deepEqual(plan.browserSpecs, ["site/tests/browser"]);
});

test("선택기가 반환하는 모든 browser 경로가 존재한다", () => {
  const changes = [
    "docs/architecture.md",
    "site/src/routes/connectors/ajv/AjvRoute.tsx",
    "site/src/shared/ui/Button.tsx",
    ...[
      "json-document",
      "json-document-affordance",
      "json-document-ajv",
      "json-document-contenteditable",
      "json-document-composer-react",
      "json-document-file-intake",
      "json-document-database",
      "json-document-annotation",
      "json-document-editing",
      "json-document-react",
      "json-document-react-hook-form",
      "json-document-rich-text",
      "json-document-rich-text-suggestion",
      "json-document-rich-text-suggestion-react",
      "json-document-rich-text-mention",
      "json-document-rich-text-mention-react",
      "json-document-rich-text-react",
      "json-document-rich-text-web",
      "json-document-selection",
      "json-document-tanstack-table",
      "json-document-web",
      "json-document-zod",
    ].map((directory) => `packages/${directory}/src/index.ts`),
  ];

  for (const path of changes) {
    for (const browserPath of createPlan([path]).browserSpecs) {
      assert.equal(existsSync(browserPath), true, `${path} -> ${browserPath}`);
    }
  }
});
