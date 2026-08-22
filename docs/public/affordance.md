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
| [Focus](affordance-focus.md) | `focusAffordance` | Tab 사이, 화살표 안, 초점 ≠ 선택 |
| [Caret](affordance-caret.md) | `caretAffordance`, `caretCursor` | I-beam 삽입점, 글 범위 |
| [Rename](affordance-rename.md) | `renameAffordance` | F2, 느린 두 번 누르기 |
| [Double-click](affordance-double-click.md) | `clickCountAffordance` | `detail` 2 |
| [Triple-click](affordance-triple-click.md) | `clickCountAffordance` | `detail` 3 |

## 키보드 TBD

| Affordance | API | Hand |
| --- | --- | --- |
| [Delete](affordance-delete.md) | `deleteAffordance` | Delete, Backspace. Delete chord는 이미 닫힘 |

## 마우스 TBD

| Affordance | API | Hand |
| --- | --- | --- |
| [Hover](affordance-hover.md) | `hoverAffordance`, `hoverCursor` | hover, 툴팁 지연, 커서 교체 |
| [Context menu](affordance-context-menu.md) | `contextMenuAffordance` | 오른쪽 클릭, Shift+F10, Menu |
| [Drop](affordance-drop.md) | `dropAffordance` | drop 대상, no-drop |
| [Duplicate](affordance-copy-drag.md) | `dragOperation` | Alt/Option 드래그 복제 |
| [Resize](affordance-resize.md) | `resizeCursor`, `resizeOffset` | 모서리, 칸, 분할선 |
| [Scroll](affordance-scroll.md) | `wheelAffordance`, `autoscrollAffordance` | wheel, autoscroll |
| [Zoom](affordance-zoom.md) | `zoomAffordance`, `zoomCursor` | Mod+휠, +/− |
| [Not-allowed](affordance-forbid.md) | `forbiddenCursor` | not-allowed, no-drop |

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
