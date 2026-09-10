> 이 문서의 측정값은 strong 전용 구현에서 얻은 역사적 기록입니다. 전체 문법 트리 구현의 지연 보장이 아닙니다.

# Markdown 원문 편집 성능

## 측정 결과

2026-09-10, Apple M3 Pro, Node 24.16.0, Google Chrome 153.0.8010.36의 크기별 A/B 결과입니다.
기준은 `e577adbeb96eb0300bef3095e37325ac481b326d`이며, 같은 dependencies의 이전/현재 source를
production bundle해 비교했습니다. 아래 값은 일반 글자·문서 끝 IME Enter 경로의 P95(ms)입니다.

| 원문 크기 | 타이핑 이전 → 현재 | IME Enter 이전 → 현재 |
| --- | ---: | ---: |
| 1천 자 | 1.9 → 0.7 | 1.8 → 0.8 |
| 1만 자 | 14.5 → 1.7 | 12.8 → 2.2 |
| 5만 자 | 112.5 → 5.7 | 101.9 → 8.2 |
| 10만 자 | 392.8 → 15.2 | 377.6 → 18.4 |

5만 자의 selection-only P95는 3.9 → 0.1ms, 10만 자는 14.7 → 0.2ms였습니다.
5만 자·500회 History의 GC 후 증가량은 **25.51 → 0.45MB**였으며, 이전/현재 모두
500회 Undo와 최초 원문 복원을 확인했습니다. 입력 샘플의 원문 길이도 누락·중복 없이 일치했습니다.

[원시 측정값](../benchmarks/results.json)에 실행 시간·환경·baseline SHA와 bundle SHA-256을 보관합니다.
측정은 구현 commit 전 working tree를 대상으로 했으며, 현재 bundle의 SHA-256은
`2cd8f9e1d705d4e0cbe85ae8f38ad967c09573aa29dc6924f659209e398de4a4`입니다.
1천/1만/5만 자는 첫 실행의 완료된 비교를 사용했습니다. 그 실행이 기존 버전의 10만 자
구간에서 멈춰 종료했고, 10만 자 A/B와 History는 `--sizes 100000`으로 분리해 완료했습니다.
두 실행의 bundle hash가 일치합니다. 재현 스크립트는 프레임 대기에 5초 timeout을 두어
완료되지 않은 프레임을 성공한 샘플로 기록하지 않습니다.
P95는 이 기기의 해당 fixture 측정값이며 모든 문법·기기의 지연 보장이 아닙니다.

실제 Lab에서 이벤트 시작부터 다음 프레임 layout 완료까지 측정한 P95는 다음과 같습니다.
이 fixture는 원문 끝에서 한 글자 앞에 입력하므로 IME 개행은 문단 내부 편집입니다.
원문 관찰 UI와 전체 화면 작업을 포함하며 위의 엔진 동기 처리 시간과 합치거나 대체하지 않습니다.

| 원문 크기 | Lab 타이핑 | Lab IME Enter |
| --- | ---: | ---: |
| 1천 자 | 3.4ms | 12.2ms |
| 1만 자 | 12.4ms | 16.0ms |
| 5만 자 | 47.3ms | 50.4ms |
| 10만 자 | 72.9ms | 101.3ms |

[Lab 원시 측정값](../benchmarks/lab-results.json)도 함께 보관합니다.
장문 화면 전체에서 한 프레임 안에 입력을 완료한다는 보장은 아직 하지 않습니다.

## 파싱 범위별 비용

동일한 public projection을 모두 읽는 Node benchmark의 **10만 자 median(ms)**입니다.
문서와 변경 종류가 다른 각 행에서 증분 처리와 전체 파싱을 교대로 측정했습니다.

| 문서 / 변경 | 전체 파싱 | 상태 재사용 |
| --- | ---: | ---: |
| 단일 긴 문단 / 일반 글자 | 42.79 | 0.22 |
| 여러 문단 / 일반 글자 | 38.41 | 0.20 |
| 여러 문단 / inline 문법 | 40.08 | 0.37 |
| 단일 긴 문단 / inline 문법 | 39.27 | 38.55 |
| 여러 문단 / 블록 경계 | 38.69 | 37.31 |

일반 글자 수정은 parser 호출 없이 위치를 갱신합니다. 여러 문단의 inline 변경은 해당
문단만 파싱하지만, 단일 긴 문단의 inline 문법과 블록 경계 변경은 전체 크기 비용이 남습니다.
[파서 원시 측정값](../../json-document-markdown/benchmarks/results.json)의 `affected`는
DOM에 전달하는 블록 범위 길이이며 parser가 실제 읽은 문자 수를 뜻하지 않습니다.

## 재현

Node 24와 설치된 Google Chrome, workspace dependencies를 사용합니다.
성능 측정 중 다른 build·test를 함께 실행하지 않습니다.

```sh
npm run build
node packages/json-document-markdown-web/benchmarks/browser.mjs --baseline e577adbe --out /tmp/markdown-performance
node packages/json-document-markdown/benchmarks/parser.mjs
```

첫 명령은 baseline의 Editing·Markdown·contenteditable·Markdown Web source와 현재 source를
동일 dependencies로 각각 production bundle합니다. 초기 DOM은 측정 밖에서 만들고,
1천/1만/5만/10만 자 타이핑·CDP IME·Enter의 동기 처리와 강제 layout 비용을 측정합니다.
매 입력 후 프레임 완료를 기다립니다. 35회 중 앞의 5회를 버리고 P95를 구합니다.
fixture는 LF로 연결된 **하나의 긴 문단**입니다. 여러 문단의 차이는 parser 검사에서 별도로 측정합니다.

History는 실제로 서로 다른 5만 자 문자열을 500회 materialize하여 교체하고 GC 후
`usedSize + backingStorageSize` 증가를 구합니다. 모든 Undo 항목과 최초 원문 복원도 확인합니다.
V8의 문자열 공유 때문에 `usedSize`만 비교하거나 동일 원문을 계속 넣는 검사는 사용하지 않습니다.

실제 Lab 전체의 이벤트부터 다음 프레임 layout까지는 production site preview에 대해 측정합니다.
이 값은 엔진 동기 처리 시간과 별개입니다. 각 모드는 25회 중 앞의 5회를 버립니다.

```sh
npm run build -w @interactive-os/json-document-site
npm run preview -w @interactive-os/json-document-site -- --host 127.0.0.1 --port 18864 --strictPort
node site/scripts/benchmark-markdown.mjs http://127.0.0.1:18864/demo/markdown-caret /tmp/markdown-lab.json
```

## 정확성

```sh
curl -fsSL https://spec.commonmark.org/0.31.2/spec.json -o /tmp/commonmark.json
node packages/json-document-markdown/scripts/check-commonmark.mjs /tmp/commonmark.json
```

CommonMark 0.31.2의 652개 예제에서 원문 편집·되돌리기마다 기존 `fromMarkdown` 전체 AST의
strong 범위와 비교합니다. seed 763으로 52,812개 비교를 수행합니다. 패키지 검사에서는
파서 호출 유무·입력 길이, 참조 정의에 따른 이전 문단 무효화, CRLF·UTF-16·DOM 재사용을 보호합니다.

## 비용이 남는 지점

문법 owner는 안전한 일반 글자 수정에 기존 문법 조각을 재사용하고, inline 수정에는 해당
문단을 파싱합니다. 참조 정의·블록 경계 등 불확실한 변경은 CommonMark 전체 파싱을 수행합니다.
전체 문자열 diff, projection/run 순회, DOM 변경 후 위치 인덱스 생성과 브라우저 layout은
문서 크기에 따른 비용이 있습니다. worker·viewport virtualization·문단 내부의 임의 문법
부분 파싱은 제공하지 않습니다. 실제 OS 한글 입력기와 다른 브라우저 성능은 별도 검증 대상입니다.
