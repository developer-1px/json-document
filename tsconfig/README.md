# TypeScript configuration profiles

이 디렉터리는 library compiler policy의 정본이다. Package의 `tsconfig.json`에는
source/output 경로, 실제 runtime 환경과 package reference만 둔다.

```text
library.json
|-- library-dom.json
|   |-- library-dom-iterable.json
|   `-- library-react.json
`-- test-dom.json (build profile과 함께 사용하는 DOM test overlay)

tsconfig.build.json
`-- packages/*/tsconfig.json project reference graph
```

- `library.json`: ES2022·NodeNext·declaration·strictness와 composite build policy
- `library-dom.json`: DOM library package
- `library-dom-iterable.json`: iterable DOM collection이 필요한 Web package
- `library-react.json`: DOM과 React JSX를 함께 쓰는 package
- `test-dom.json`: DOM test의 library, ambient type과 no-emit policy

`rootDir`, `outDir`, `tsBuildInfoFile`은 상속 파일 기준으로 경로가 해석되는 것을
피하기 위해 leaf config가 소유한다. Build info는 기존 `clean`이 산출물과 함께
제거할 수 있도록 각 package의 `dist/.tsbuildinfo`에 둔다.

전체 library graph는 root의 `npm run build`로 검증하고, 강제 clean은
`npm run build:clean`을 사용한다. Package 단독 build는 기존 workspace script를
유지한다. Test config는 build config를 상속하되 `composite: false`로 독립 test
program을 구성한다.
