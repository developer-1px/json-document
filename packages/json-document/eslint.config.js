// ESLint config — domain verb 모듈끼리 import 금지 (ADR-0002 / SPEC §0.5 layer 규약).
// verb pillar(clipboard·editing) 는 서로/자기 sibling 을 import 하지 않는다.
// 합성은 application/document facade 에서만. type-only import 는 허용.

const verbPillarGlobs = ["src/domain/clipboard/**/*.ts", "src/domain/editing/**/*.ts"];

export default [
  {
    files: verbPillarGlobs,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./*", "../clipboard/*", "../editing/*"],
              allowTypeImports: true,
              message:
                "verb 모듈끼리 import 금지. 합성은 application/document facade 에서만 (ADR-0002 / SPEC §0.5). type-only import 는 허용 — `import type` 사용.",
            },
          ],
        },
      ],
    },
  },
];
