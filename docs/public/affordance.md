# Affordance

제품의 화면은 호스트가 그립니다. json-document가 최전선에서 주는 것은
리스트박스나 나무가 아니라, 30년 동안 같은 손으로 학습된 키보드와
마우스와 커서입니다.

`@interactive-os/json-document-affordance`가 그 계약을 닫습니다. 단축키를
제품마다 바꾸지 않습니다. 구현이 없는 손은 TBD로 남기고, 화면 위젯으로
대체하지 않습니다. TBD 페이지의 코드는 사용법 명세입니다. 패키지에
아직 없습니다.

호스트 이벤트와 json-document 사이를 이렇게 잇습니다. 시점은 리스너가
고르고, 읽는 법은 `applyAffordance` 하나입니다. 미리보기는 `{ hand, cursor }`
이고, 쓰기는 `commitAffordance` 다음 `{ commit }` 포트입니다.

```ts
import {
  applyAffordance,
  forbiddenCursor,
  pointerSelect,
} from "@interactive-os/json-document-affordance";

function onPointerDown(event: PointerEvent, itemId: string) {
  applyAffordance(pointerSelect(event), {
    hand: (hand) => {
      if (hand.type === "select") {
        editor.dispatch({ type: "selection.set", itemId, mode: hand.operation });
      }
    },
  });
}

function onPointerMove(event: PointerEvent) {
  applyAffordance(forbiddenCursor({ allowed: hostCanDrop(event), dropping: true }), {
    cursor: (cursor) => {
      event.currentTarget.style.cursor = cursor;
    },
  });
}
```

```sh
npm i @interactive-os/json-document-affordance
```

Editing은 선택과 작업을 기억합니다. Adapter는 키 chord를 command로
번역합니다. Connector는 구독과 질의를 붙입니다. 어포던스는 그 command가
무슨 손인지를 정합니다. 호스트는 마크업과 장르 Intent만 가집니다.

이 층이 닫히는 축은 세 개입니다.

- 키보드: [APG Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)가
  Tab은 컴포넌트 사이, 화살표는 컴포넌트 안, 초점과 선택은 다르다고 닫는다.
- 마우스: [Pointer Events](https://www.w3.org/TR/pointerevents/)와
  [UI Events](https://www.w3.org/TR/uievents/)가 click·auxclick·contextmenu·
  wheel·pointer capture·`detail` 횟수를 닫는다.
- 커서: [CSS UI 4 predefined cursors](https://www.w3.org/TR/css-ui-4/#cursor)가
  지금 이 자리에서 가능한 손을 키워드 집합으로 닫는다.

## 이미 닫힌 손

| Affordance | API | Hand |
| --- | --- | --- |
| [Select](affordance-select.md) | `pointerSelect`, `planeHitAffordance`, `resolveAffordanceKey` | 클릭, 이미 고른 집합 유지, Shift 범위, Mod 토글, 화살표 |
| [Typeahead](affordance-typeahead.md) | `typeaheadAffordance` | 인쇄 글쇠 prefix 점프 |
| [Escape](affordance-cancel.md) | `escapeAffordance` | 제스처 `cancel`, 그다음 선택 `clear` |
| [Expand/Collapse](affordance-fold.md) | `treeAffordance` | 나무 왼쪽 접힘, 오른쪽 펼침 |
| [Undo](affordance-history.md) | `historyAffordance` | Mod+Z, Mod+Shift+Z |
| [Nudge](affordance-nudge.md) | `nudgeAffordance` | 화살표 한 단위, Shift 큰 단위 |
| [Drag](affordance-drag.md) | `dragAffordance`, `commitAffordance` | 고른 대상을 포인터로 옮김 |
| [Marquee](affordance-marquee.md) | `marqueeAffordance`, `commitAffordance` | 빈 곳에서 사각형으로 여러 대상 |
| [Pan](affordance-pan.md) | `panAffordance` | Space+드래그, grab |
| [Snap](affordance-snap.md) | `snapAffordance` | 그리드·가이드, 수정 키로 해제 |
| [Press / Activate](affordance-activate.md) | `pressAffordance`, `activateAffordance` | custom Press lifecycle, native activation |
| [Delete](affordance-delete.md) | `deleteAffordance` | Delete, Backspace |
| [Hover](affordance-hover.md) | `hoverAffordance` | 평면 윤곽, 툴팁 지연 |
| [Context menu](affordance-context-menu.md) | `contextMenuAffordance` | 오른쪽 클릭, 선택은 유지 |
| [Drop](affordance-drop.md) | `dropAffordance` | drop 대상, 선택 유지, no-drop |
| [Duplicate](affordance-copy-drag.md) | `dragOperation` | Alt/Option 드래그 복제 |
| [Resize](affordance-resize.md) | `resizeAffordance` | 모서리 핸들, CSS UI 4 커서 |
| [Scroll](affordance-scroll.md) | `wheelAffordance` | wheel 팬 |
| [Zoom](affordance-zoom.md) | `wheelAffordance`, `zoomAffordance` | Mod+휠, +/− |
| [Not-allowed](affordance-forbid.md) | `forbiddenCursor` | not-allowed, 잠긴 객체 |
| [Focus](affordance-focus.md) | `focusAffordance` | Tab 사이, 화살표 안, 초점 ≠ 선택 |
| [Caret](affordance-caret.md) | `caretAffordance`, `caretCursor` | I-beam 삽입점, 글 범위 |
| [Rename](affordance-rename.md) | `renameAffordance` | F2, 느린 두 번 누르기 |
| [Double-click](affordance-double-click.md) | `clickCountAffordance` | `detail` 2, 글 단어 범위 |
| [Triple-click](affordance-triple-click.md) | `clickCountAffordance` | `detail` 3 |

## 평면

평면 위 객체에서 손은 선택 도구가 기본입니다. 빈 곳과 객체 히트가 다르고,
고른 집합이 곧 옮길 대상입니다.

근거 축: [Figma 레이어 선택](https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects),
[FigJam 선택·이동](https://help.figma.com/hc/en-us/articles/1500004292221-Select-move-and-order-objects-in-FigJam),
[Illustrator 기본 단축키](https://helpx.adobe.com/illustrator/using/default-keyboard-shortcuts.html),
[tldraw 커서](https://tldraw.dev/sdk-features/cursors), Excalidraw Space/가운데/H 팬,
[CSS UI 4 cursor](https://www.w3.org/TR/css-ui-4/#cursor),
[Apple HIG Drag and drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop).

수렴: 안정, 떠오름, 갈림, 관례.

### Select

| 손 | 함의 | 수렴 | 상태 |
| --- | --- | --- | --- |
| 객체 click | 그 객체만 replace | 안정 | [닫힘](affordance-select.md) |
| 이미 고른 객체 click (수정 키 없음) | 집합 유지. 다음 드래그의 대상은 집합 전부 | 안정 | [닫힘](affordance-select.md) |
| 안 고른 객체 click | 집합을 그 객체 하나로 바꿈. 드래그 대상도 그 하나 | 안정 | [닫힘](affordance-select.md) |
| Shift+click | 집합에 더하거나, 이미 있으면 뺌 | 안정 | [닫힘](affordance-select.md) |
| Mod+click (⌘/Ctrl) | 호스트가 `nestedId`를 줄 때만 자식. 없으면 일반 click. 리스트박스 토글이 아님 | 갈림 | [닫힘](affordance-select.md) |
| 빈 곳 click (이동 0) | 선택 전부 해제 | 안정 | [닫힘](affordance-marquee.md) |
| 빈 곳 drag | 마키. 상자 안 또는 닿는 객체를 집합으로 | 안정 | [닫힘](affordance-marquee.md) |
| Shift+마키 | 기존 집합에 더함 | 안정 | [닫힘](affordance-marquee.md) |
| Mod+마키 | 호스트가 중첩 히트를 줄 때만 자식. 토글이 아님 | 갈림 | [닫힘](affordance-marquee.md) |
| ⌘/Ctrl+A | 보이는 평면의 전부 | 안정 | [닫힘](affordance-select.md) |

### Escape

| 손 | 함의 | 수렴 | 상태 |
| --- | --- | --- | --- |
| Escape, 제스처 중 | 그 제스처만 버린다. 커밋하지 않음. 기존 선택은 유지 | 안정 | [닫힘](affordance-cancel.md) |
| Escape, 제스처 없음 + 선택 있음 | 선택을 지운다 | 안정 | [닫힘](affordance-cancel.md) |
| Escape, 둘 다 없음 | no-op | 안정 | [닫힘](affordance-cancel.md) |
| 두 번 | 안쪽(제스처) → 바깥(선택). 한 키에 두 층을 한 번에 지우지 않음 | 안정 | [닫힘](affordance-cancel.md) |
| pointercancel / lostpointercapture | 포인터 제스처만 cancel. clear가 아님 | 안정 | [닫힘](affordance-cancel.md) |

### Drag

| 손 | 함의 | 수렴 | 상태 |
| --- | --- | --- | --- |
| 고른 객체를 끈다 | 집합 전부가 같은 dx/dy | 안정 | [닫힘](affordance-drag.md) |
| 미리보기 | 커밋 전 화면만 움직임. 0 이동 mouseup은 선택만 | 안정 | [닫힘](affordance-drag.md) |
| Shift+드래그 | 축 구속 (가로/세로) | 안정 | [닫힘](affordance-drag.md) |
| Alt/Option+드래그 | 복제. 원본 남김. `copy` 커서 | 안정 | [닫힘](affordance-copy-drag.md) |
| 드롭 후 선택 | 옮긴 집합이 선택된 채로 남음 | 안정 | [닫힘](affordance-drop.md) |
| 커밋 전 Escape | 미리보기 폐기, 좌표 불변 | 안정 | [닫힘](affordance-cancel.md) |

### Marquee

| 손 | 함의 | 수렴 | 상태 |
| --- | --- | --- | --- |
| 빈 곳에서만 시작 | 객체 위에서 끌면 이동이지 마키가 아님 | 안정 | [닫힘](affordance-marquee.md) |
| 반투명 밴드 + crosshair | 객체를 가리지 않음 | 안정 | [닫힘](affordance-marquee.md) |
| mouseup | 밴드 확정, 오버레이 제거 | 안정 | [닫힘](affordance-marquee.md) |
| 이동 0 | 마키가 아니라 clear | 안정 | [닫힘](affordance-marquee.md) |
| Escape 중 | 밴드 제거, 이전 선택 유지 | 안정 | [닫힘](affordance-cancel.md) |
| 닿으면 포함 | 평면 픽은 intersect. `contain: "inside"`는 호스트가 고름 | 갈림 | [닫힘](affordance-marquee.md) |

### Pan / Zoom / Scroll

| 손 | 함의 | 수렴 | 상태 |
| --- | --- | --- | --- |
| Space+드래그 | 손바닥. 객체·선택 불변 | 안정 | [닫힘](affordance-pan.md) |
| 가운데 버튼 드래그 | Space와 같은 팬 | 관례 | [닫힘](affordance-pan.md) |
| 휠 | 스크롤/팬. 객체 좌표 불변 | 안정 | [닫힘](affordance-scroll.md) |
| Mod+휠 | 줌. 커서 `zoom-in` / `zoom-out` | 안정 | [닫힘](affordance-zoom.md) |
| 빈 선택에서 화살표 | 평면은 팬 | 갈림 | [닫힘](affordance-pan.md) |

### Nudge / Snap

| 손 | 함의 | 수렴 | 상태 |
| --- | --- | --- | --- |
| Arrow | 고른 집합을 1단위 | 안정 | [닫힘](affordance-nudge.md) |
| Shift+Arrow | 고른 집합을 큰 단위 (보통 10) | 안정 | [닫힘](affordance-nudge.md) |
| 스냅 | 드래그 커밋이 그리드/가이드에 붙음 | 안정 | [닫힘](affordance-snap.md) |
| 스냅 해제 수정 키 | 평면은 Mod(⌘/Ctrl) | 갈림 | [닫힘](affordance-snap.md) |

### Resize / 커서

| 손 | 함의 | 수렴 | 상태 |
| --- | --- | --- | --- |
| 선택 바운딩 박스 핸들 | 크기 변경. Shift면 비율 유지 | 안정 | [닫힘](affordance-resize.md) |
| `grab` → `grabbing` | 팬/잡기 | 안정 | [닫힘](affordance-pan.md) |
| `move` | 고른 대상 이동 | 안정 | [닫힘](affordance-drag.md) |
| `copy` | Option 복제 중 | 안정 | [닫힘](affordance-copy-drag.md) |
| `not-allowed` / `no-drop` | 못 놓는 자리 | 안정 | [닫힘](affordance-forbid.md) |
| `n-resize` … `nwse-resize` | 모서리 리사이즈 | 안정 | [닫힘](affordance-resize.md) |

### 가장자리

| 손 | 함의 | 수렴 | 상태 |
| --- | --- | --- | --- |
| Delete / Backspace | 고른 집합 삭제 | 안정 | [닫힘](affordance-delete.md) |
| 오른쪽 클릭 | 컨텍스트 메뉴. 선택은 유지 | 안정 | [닫힘](affordance-context-menu.md) |
| Enter / 더블클릭 | 그룹이면 한 단계 들어가기, 텍스트면 편집. 납작한 평면은 no-op | 안정 | [닫힘](affordance-activate.md) |
| 잠긴 객체 | 일반 click으로 안 집어짐 | 안정 | [닫힘](affordance-forbid.md) |
| 호버 하이라이트 | 집기 전에 윤곽만 | 떠오름 | [닫힘](affordance-hover.md) |

## 커서가 닫는 손

CSS UI 4 `<cursor-predefined>`는 이 집합이 끝입니다. 새 커서 이름을
만들지 않습니다.

| 커서 | 손 |
| --- | --- |
| `auto`, `default`, `none` | 호스트·UA 기본. 이 층이 새 문법을 열지 않음 |
| `pointer` | [Activate](affordance-activate.md) |
| `text`, `vertical-text` | [Caret](affordance-caret.md) |
| `cell`, `crosshair` | [Marquee](affordance-marquee.md), [Select](affordance-select.md) |
| `context-menu` | [Context menu](affordance-context-menu.md) |
| `help` | [Hover](affordance-hover.md) |
| `move`, `grab`, `grabbing` | [Drag](affordance-drag.md), [Pan](affordance-pan.md) |
| `copy`, `alias` | [Duplicate](affordance-copy-drag.md) |
| `no-drop`, `not-allowed` | [Not-allowed](affordance-forbid.md), [Drop](affordance-drop.md) |
| `n-resize` … `nwse-resize`, `col-resize`, `row-resize` | [Resize](affordance-resize.md) |
| `all-scroll` | [Pan](affordance-pan.md) |
| `zoom-in`, `zoom-out` | [Zoom](affordance-zoom.md) |
| `progress`, `wait` | UA 바쁨. 편집 손이 아님 |

## 이 층이 아닌 것

- 값 삽입, IME로 글자를 쓰는 일, 클립보드로 값을 옮기는 완전한 편집기는
  Hands입니다.
- chord를 command로 번역하는 일은 Adapter입니다.
- 구독과 질의는 Connector입니다.
- 마크업, ARIA role, 히트 테스트, 기하, 장르 Intent는 호스트입니다.
- 터치·펜·눈은 이 패키지가 닫는 손이 아닙니다.

라이브 화면은 닫힌 손을 호스트 그림에 붙인 증명입니다. 위젯을 가져가는
입구가 아닙니다.
