# Test project configuration

`vitest.shared.ts`는 repository Vitest project의 공통 runner policy 정본이다.
Package와 site의 `vitest.config.ts`에는 project 이름, source alias, plugin, dedupe,
특수 include처럼 실제 차이만 둔다.

```text
vitest.config.ts
`-- test.projects
    |-- packages/*/vitest.config.ts
    `-- site/vitest.config.ts

test/vitest.shared.ts
|-- defineNodeProject
|-- defineNodeReactProject
|-- defineDOMProject
`-- defineDOMReactProject
```

- 전체 project: `npm run test:projects`
- 선택 project: `npm run test:projects -- --project <name>`
- package 단독: 각 workspace의 기존 `npm test` command
- browser acceptance: `npm run browser:test`

Playwright의 `setup` project는 acceptance server readiness를 먼저 증명하고
`chrome` project가 이를 dependency로 선언한다. Unit/conformance project와 browser
acceptance project는 서로 대체하지 않는다.
