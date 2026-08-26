# json-document DOM Editing Lifecycle Standard

상태: Canonical

이 문서는 `json-document` repository의 contenteditable integration이 W3C DOM,
Input Events, UI Events, Clipboard Events와 model lifecycle을 연결하는 유일한
사람 작성 정본이다. `standards/repository-naming.md`가 DOM adapter와
native-input DOM lease의 이름을 정하고,
`standards/repository-implementation-shape.md`가 책임의 배치를 정한다면, 이
문서는 **browser event부터 model commit과 selection restore까지의 순서와
소유권**을 정한다.

이 문서는 현재 public Adapter·Binding API, runtime 동작, browser native input,
IME 의미와 model별 reconciliation을 변경하지 않는다.

## 외부 표준 상태

| 기준 | 이 문서가 사용하는 것 | 2026-08 상태와 한계 |
| --- | --- | --- |
| [UI Events](https://www.w3.org/TR/uievents/) | `compositionstart`, `compositionupdate`, `compositionend`, keyboard·composition 관계 | W3C Working Draft. Composition event vocabulary와 상대 순서의 기준이다. |
| [Input Events Level 2](https://www.w3.org/TR/input-events-2/) | `beforeinput`, `input`, `inputType`, `isComposing`, target range | W3C Working Draft. Browser별 editing 동작과 event timing이 완전히 같다고 가정하지 않는다. |
| [Clipboard API and events](https://www.w3.org/TR/clipboard-apis/) | `copy`, `cut`, `paste`, `DataTransfer` | Structured/HTML/plain representation과 system clipboard 경계의 기준이다. |
| [DOM Standard](https://dom.spec.whatwg.org/) | DOM tree, Range, Selection과 event dispatch | DOM은 platform observation이며 canonical document가 아니다. |
| [React DOM](https://react.dev/reference/react-dom/components/common) | `contentEditable` children을 text input library가 직접 관리하는 경계 | React renderer와 browser mutation ownership을 동시에 행사하지 않는다. |

Working Draft의 특정 event order는 강제 contract가 아니다. Adapter는 관찰된
browser order를 받아 model contract로 정규화하고, 지원하지 않는 order에서는
실패를 숨기지 않고 최신 model을 다시 render한다.

## Canonical vocabulary

| Term | 의미 | 포함하지 않는 것 |
| --- | --- | --- |
| Editing host | Event를 받는 한 contenteditable root | Nested input·textarea·select 또는 별도 contenteditable root |
| Platform intent | `beforeinput.inputType`, clipboard event처럼 browser가 알린 사용자 의도 | Product command와 domain intent 자체 |
| DOM observation | Native mutation 뒤 DOM value와 DOM selection을 읽은 결과 | Canonical model snapshot |
| Model render | 최신 model을 DOM에 투영하는 작업 | Native input 중 browser mutation |
| Selection observation | DOM Selection을 model selection으로 읽는 작업 | Focus policy와 product selection policy |
| Selection restore | Model selection을 DOM Selection으로 복원하는 작업 | Selection ownership의 영구 이전 |
| Composition session | `compositionstart`부터 `compositionend`와 trailing input reconciliation까지 | Keyboard event만으로 추론한 IME 상태 |
| Native-input DOM lease | Browser가 DOM을 바꾸는 동안 model-to-DOM render만 유예하는 상태 | Model ingestion, collaboration sync 또는 model validation 중단 |
| Reconciliation | DOM observation을 model-specific operation으로 변환하고 최신 model을 다시 render하는 단계 | DOM을 canonical storage로 채택하는 것 |

Public identifier와 phase의 canonical mapping은 다음과 같다.

| Package | Public entry | DOM boundary | Model commit |
| --- | --- | --- | --- |
| `packages/json-document-contenteditable` | `createContentEditableBinding`, `ContentEditable` | `TextDOMAdapter.observe/render/restoreSelection` | `JSONDocument.commit`의 string `replace` |
| `packages/contenteditable-collaboration` | `createContentEditableAdapter` | `TextDOMAdapter.observe/render/restoreSelection` | `TextRuntime.capture -> plan -> commit` |
| `packages/json-document-rich-text-web` | `createRichTextContentEditableBinding` | `readRichTextDOMSelection`, `restoreRichTextDOMSelection`, scoped DOM text observation | `RichTextEditor.dispatch`의 semantic intent |

`Binding`과 `Adapter`라는 public 이름은 기존 package contract를 보존한다. 이
문서는 세 구현을 하나의 TypeScript interface로 합치지 않는다.

## 공통 lifecycle

세 integration은 다음 lifecycle language를 공유한다.

```text
bind
`-- render model
    `-- restore selection when available
        `-- wait for platform event
            |
            +-- interceptable intent
            |   `-- prevent native mutation
            |       `-- commit semantic/model operation
            |
            `-- native mutation path
                `-- begin DOM lease / capture basis
                    `-- browser mutates DOM
                        `-- observe DOM
                            `-- model-specific reconcile
                                `-- render latest model
                                    `-- restore/rebase selection
```

공통 lifecycle은 phase 이름을 공유할 뿐 같은 algorithm을 요구하지 않는다.

### 1. Bind

- Editing host별 listener와 model subscription을 한 번 등록한다.
- 초기 model을 DOM에 render한다.
- Nested form control과 별도 contenteditable host의 event를 현재 host의 입력으로
  취급하지 않는다.
- Unbind 또는 destroy는 listener, subscription, timer와 active lease를 해제한다.

### 2. Observe intent

- `beforeinput`은 가능한 경우 native mutation 전 platform intent를 제공한다.
- `InputEvent.getTargetRanges()`가 있으면 Rich Text selection mapping의
  observation으로 사용할 수 있다.
- `beforeinput`이 cancelable이고 adapter가 그 intent를 완전히 처리할 수 있을
  때만 `preventDefault()`하고 model operation을 직접 수행한다.
- Composition 중 `beforeinput`은 cancelable하지 않을 수 있으므로 일반 semantic
  command처럼 처리하지 않는다.

### 3. Begin native-input ownership

- Plain local·collaboration string은 `beforeinput` 또는 `compositionstart`에서
  native-input DOM lease를 연다.
- Collaboration은 lease를 열기 전에 `TextRuntime.capture`로 causal basis를
  고정한다.
- Rich Text는 일반 `beforeinput`을 semantic intent로 처리하지만 composition은
  browser가 선택한 scoped DOM element를 직접 바꾸게 한다.
- Lease 중 유예하는 것은 model-to-DOM render뿐이다.

### 4. Browser mutation

- Browser가 editing host 또는 scoped descendant DOM을 변경한다.
- DOM value와 DOM Selection은 아직 canonical model이 아니다.
- Composition session 안의 `input`만으로 commit 완료를 추론하지 않는다.
- Keyboard event의 key나 `isComposing`만으로 composition 시작·종료를 만들지
  않는다.

### 5. Reconcile

- Non-composition plain input은 `input`에서 observation을 commit한다.
- Composition은 `compositionend`와 trailing `input`의 browser별 상대 순서를
  모두 허용한다.
- 같은 composition session은 model change와 history entry를 정확히 한 번만
  만든다.
- Empty 또는 원상 복구된 composition은 model change를 만들지 않는다.
- Stale capture, unavailable target, invalid selection 또는 failed model commit은
  DOM을 최신 model로 복구하고 failure를 보고한다.

### 6. Publish latest model

- Reconciliation 뒤에는 현재 DOM observation이 아니라 **최신 model**을 다시
  render한다.
- Collaboration ingestion은 lease 중에도 계속되고 release 때 그 결과를 함께
  render한다.
- Selection은 model commit 결과 또는 capture basis를 통해 rebase한 뒤
  복원한다.
- Target이 사라지거나 다른 type이 되면 빈 DOM 또는 latest valid model을
  render하고 실패를 닫힌 상태로 노출한다.

### 7. Cancel and recover

- Plain adapter의 `blur`, public `cancel`, `reset`과 unbind는 미완료 lease를
  버리고 model을 다시 render한다.
- `beforeinput` 뒤 `input`이 오지 않는 경우 zero-delay fallback으로 native lease를
  해제한다.
- Late composition event가 종료된 lease를 두 번째 commit으로 만들지 않는다.
- Rich Text destroy는 pending composition timer를 해제하며 종료된 binding이
  model operation을 만들지 않게 한다.

## Event ownership

| Event | Local string Binding | Collaborative text Adapter | Rich Text Binding |
| --- | --- | --- | --- |
| `beforeinput` | Lease 시작; browser mutation 허용 | Capture와 lease 시작; browser mutation 허용 | 지원 intent는 prevent하고 semantic dispatch; composition input은 browser에 맡김 |
| `input` | Non-composition DOM observation commit; composition tail 무시 | Non-composition plan/commit; composition tail selection reconcile | Ending composition DOM이 final인지 재검사 |
| `compositionstart` | Composing lease 시작 | Capture를 가진 composing lease 시작 | Selection과 scoped DOM text를 capture |
| `compositionupdate` | 별도 listener 없음; browser DOM mutation으로 관찰 | 별도 listener 없음; browser DOM mutation으로 관찰 | 별도 listener 없음; scoped DOM mutation으로 관찰 |
| `compositionend` | DOM string을 한 번 commit하고 trailing input guard 진입 | DOM observation을 plan/commit하고 tail reconciliation 진입 | Ending phase로 전환하고 microtask/timer에서 scoped diff commit |
| `copy` | Browser 기본 plain-text 처리 | Browser 기본 plain-text 처리 | Structured/HTML/plain representation을 Web clipboard binding으로 작성 |
| `cut` | Native mutation이 `beforeinput/input` lifecycle로 commit됨 | Native mutation이 capture/plan/commit됨 | Clipboard payload 작성 후 Rich Text selection cut dispatch |
| `paste` | Native mutation이 `beforeinput/input` lifecycle로 commit됨 | Native mutation이 capture/plan/commit됨 | Structured > HTML > plain priority로 semantic paste dispatch |
| `blur` | Active lease cancel과 latest render | Active lease/tail cancel과 latest render | Binding-level blur handler 없음; host/renderer가 focus policy 소유 |
| `keydown` | Binding이 command policy를 소유하지 않음 | Adapter가 command policy를 소유하지 않음 | Backspace/Delete와 native history를 semantic intent로 intercept하고 뒤따르는 동일 deletion `beforeinput`을 중복 처리하지 않음 |

Clipboard event와 뒤따르는 `beforeinput`이 모두 오는 browser에서도 한 사용자
작업을 두 번 commit하지 않아야 한다. Rich Text clipboard binding은 clipboard
event에서 default를 막고 semantic operation을 소유한다. Plain adapter는 system
clipboard representation을 해석하지 않고 browser가 만든 DOM mutation을
관찰한다.

## Model-specific reconciliation

### Local JSON Document string

```text
beforeinput/compositionstart
`-- lease model-to-DOM render
    `-- observe { value, selection }
        `-- JSONDocument.commit([{ op: "replace", path, value }])
            `-- render latest string
                `-- restore UTF-16 selection
```

- Capture artifact가 없다.
- Lease 중 다른 pointer의 commit은 model에 즉시 반영되지만 bound root render는
  lease 종료까지 유예한다.
- Bound pointer가 string이 아니면 native input을 취소하거나 failure 뒤 DOM을
  복구한다.

### Collaborative text

```text
beforeinput/compositionstart
`-- TextRuntime.capture(pointer)
    `-- browser DOM mutation
        `-- TextRuntime.plan(capture, observation)
            `-- TextRuntime.commit(plan)
                `-- rebase/tail selection
                    `-- render latest materialized text
```

- Capture는 text value, selection과 causal frontier를 고정한다.
- Remote bundle ingestion과 materialization은 lease 중에도 계속된다.
- Commit은 DOM 전체 overwrite가 아니라 capture-relative text splice를 author한다.
- Composition tail은 post-`compositionend` input과 remote merge 뒤 selection을 한
  번 더 reconcile할 수 있지만 두 번째 text change를 만들지 않는다.
- 같은 actor가 causal history를 바꾸거나 target generation이 바뀌면 stale plan을
  commit하지 않고 최신 model로 복구한다.

### Rich Text tree

```text
ordinary beforeinput
`-- DOM selection / target range mapping
    `-- RichTextIntent dispatch
        `-- renderer publishes canonical tree

compositionstart
`-- capture RichTextSelection + scoped DOM text
    `-- browser mutates scoped DOM
        `-- compositionend + trailing input stabilization
            `-- compute one scoped text diff
                `-- selection.set + text.insert(historyGroup)
                    `-- renderer publishes tree and restores selection
```

- DOM tree와 HTML은 canonical Rich Text storage가 아니다.
- 지원하는 `inputType`은 semantic intent로 바꾸고 native DOM mutation을 막는다.
- Composition만 scoped DOM mutation을 허용하고 한 text insertion history group으로
  reconcile한다.
- Selection은 node ID와 text/child offset으로 mapping하며 plain absolute offset과
  같은 type이 아니다.
- Clipboard는 versioned Rich Text slice, semantic HTML, plain text의 우선순위를
  가진 별도 Web binding이다.

## Selection contract

| Model | DOM observation | Model selection | Restore 기준 |
| --- | --- | --- | --- |
| Local string | Root plain text의 UTF-16 absolute offset | `{ anchor, focus }` | Latest string의 scalar boundary로 clamp |
| Collaborative text | Root plain text의 UTF-16 absolute offset | `TextSelection`과 relative rebase basis | Text commit 또는 tail rebase 결과 |
| Rich Text | `data-rich-text-*` host와 DOM Range | `RichTextSelection<RichTextPoint>` | Node ID, text offset 또는 child boundary |

Selection type을 통합하지 않는다. 공유할 것은 `observe -> model mapping -> restore`
순서뿐이다.

## Browser evidence matrix

`supported`는 실제 native browser 경로에서 검증됐다는 뜻이다. Synthetic
`InputEvent`·`CompositionEvent` unit test는 algorithm 검증이지 native IME 지원
증거가 아니다.

| Scenario | Chromium | Firefox | WebKit | 현재 증거 |
| --- | --- | --- | --- | --- |
| Local string typed input | 부분 검증 | 미검증 | 미검증 | Chrome site path는 synthetic event; package test는 jsdom |
| Local string native IME | 미검증 | 미검증 | 미검증 | Package composition unit test만 존재 |
| Collaborative text typed input | 미검증 | 미검증 | 미검증 | Package jsdom test만 존재; public browser path 없음 |
| Collaborative text native IME와 remote merge | 미검증 | 미검증 | 미검증 | Event-order·rebase unit test만 존재 |
| Rich Text semantic `beforeinput` | 검증 | 검증 | 검증 | Official Rich Text browser suite를 세 engine에서 실행 |
| Rich Text native Korean IME | 검증 | 미검증 | 미검증 | Chromium CDP `Input.imeSetComposition`; corpus에 Firefox/WebKit skip reason 기록 |
| Rich Text selection·synthetic clipboard | 검증 | 검증 | 검증 | Engine-neutral `DataTransfer` fixture로 binding과 representation priority를 검증; system clipboard 지원 증거는 아님 |
| Rich Text unexpected descendant mutation 뒤 publish 복구 | 검증 | 검증 | 검증 | 외부 DOM 변경이 model을 바꾸지 않고 다음 canonical publish에서 교체됨 |

이 표는 Official Rich Text vertical의 세 desktop engine 증거만 나타낸다. 따라서
local string·collaboration이나 native IME까지 repository-wide로
“Chromium·Firefox·WebKit 지원”한다고 표현하지 않는다. Native IME와 system
clipboard는 synthetic algorithm 증거, automation API 부재, product support를
구분해서 기록한다.

## 지속 compatibility audit

`standards/json-document-rich-text-v1/corpora/browser.json`의
`defectFamilies`가 editable compatibility 지식의 기계 검증 가능한 정본이다.
현재 필수 결함군은 composition, selection, deletion, atom/void,
placeholder/managed break, clipboard, unexpected DOM mutation,
focus/ShadowRoot, Android/soft keyboard다.

각 결함군은 다음 네 항목을 빠짐없이 유지한다.

- 실제 browser 또는 harness에서 관찰한 현상(`observation`)
- canonical model이 지켜야 하는 불변식(`invariant`)
- 실행 가능한 case 또는 명시적인 unavailable 기록(`evidence`)
- workaround를 재검토하거나 제거할 조건(`revisitWhen`)

증거 상태는 `verified`, `synthetic`, `unavailable`, `unverified`로만 기록한다.
product-real stable automation은 CI를 막는다. Synthetic event, platform API가 없는
native IME와 Android soft keyboard는 알고리즘 회귀를 보완하거나 공백을 드러내는
증거이지 browser 지원을 주장하는 근거가 아니다. 새 drift 또는 leak을 발견하면
먼저 해당 결함군의 observation과 invariant를 갱신하고, 최소 재현을 corpus에 넣은
뒤 canonical owner에서 수정한다. Host와 Demo에는 복구 코드를 두지 않는다.

## Verification contract

DOM lifecycle 변경은 영향을 받은 model에 맞게 다음을 증명한다.

### 공통

- Listener bind/unbind와 nested editing host scoping
- `beforeinput -> input` non-composition commit 정확히 한 번
- `compositionstart -> compositionend` commit 정확히 한 번
- `input`이 `compositionend` 전과 후에 오는 두 순서
- Cancel/reset/blur 뒤 late event가 commit을 만들지 않음
- Model render와 selection restore
- Unavailable/stale target의 fail-closed recovery

### Collaboration 추가

- Lease 중 remote ingestion과 materialization 지속
- Capture-relative plan/commit
- Remote merge 뒤 selection rebase
- Stale capture와 generation 변경 거부

### Rich Text 추가

- Supported `inputType`의 semantic intent mapping
- Scoped composition diff와 하나의 undo history group
- DOM Selection과 `RichTextSelection` round trip
- Structured/HTML/plain clipboard priority
- 실제 contenteditable browser path

Browser 결과는 다음 중 하나로만 보고한다.

```text
verified      # 해당 browser의 native 또는 실제 product path 실행
synthetic     # jsdom 또는 dispatchEvent로 algorithm만 실행
unavailable   # automation/platform capability와 시도 결과를 기록
unverified    # 아직 실행 증거가 없음
```

`synthetic`을 browser 지원으로 올려 쓰지 않는다.

## 변경 절차

새 DOM phase, event ownership 또는 support claim은 먼저 이 문서를 갱신한다.
Public vocabulary 변경은 `standards/repository-naming.md`, 책임 이동은
`standards/repository-implementation-shape.md`, Rich Text schema·behavior 변경은
`standards/json-document-rich-text-v1/profile.md`가 별도로 승인한다.

세 integration의 중복 구현은 같은 platform invariant와 같은 failure recovery를
가질 때만 함께 추출한다. Local replace, causal text plan과 Rich Text semantic
intent는 서로 다른 model contract이므로 공통 runtime으로 만들지 않는다.
