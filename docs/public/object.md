# Object

Object는 안정된 ID를 가진 객체를 집는 편집기입니다. 줄 번호가 아니라 키
가족(key family)을 씁니다. 화면에서 어디를 눌렀는지는 제품이 계산하고,
editor에는 객체 ID만 넘깁니다.

색을 채우거나 지우는 요청은 Intent로 들어갑니다. 기하와 히트 테스트는
editor 밖에 남습니다.

## API Reference

### `createObjectEditor(source, options?)`

Object document의 editing session을 만듭니다. 반환된 `ObjectEditor`는
`snapshot`, `selectedObjects`, `dispatch`, `copy`, `cut`, `undo`, `redo`,
`subscribe`를 공개합니다. `source`는 `ObjectDocument` 또는 기존
`JSONDocument<ObjectDocument>`이며, `options.createId`는 paste가 만드는 객체의
ID 정책을 Host가 주입하는 자리입니다.

### `ObjectIntent`

`dispatch`가 받는 Object domain command입니다. 공개 variant는
`selection.set`, `selection.remove`, `selection.fill`, `object.translate`,
`object.resize`, `clipboard.paste`입니다. DOM event, pointer 좌표, clipboard
event를 Intent에 넣지 않습니다.

### `ObjectSelectionMode`

`selection.set`은 `replace`, `extend`, `toggle`의 공통 selection vocabulary를
직접 받습니다. key-family 고유 집합 연산이 필요한 호출자는 `add`와
`subtract`도 사용할 수 있습니다. `extend`는 Object editor 안에서 `add`와
같은 합집합 선택으로 해석되므로 React·Affordance 소비처가 이를 번역하지
않습니다.

### `ObjectEditor.copy()` / `ObjectEditor.cut()`

현재 선택을 `ObjectClipboard`로 투영합니다. Web clipboard event의
직렬화·`preventDefault()`·paste 판정은 Web Adapter의
[`createWebClipboardSurface`](adapter-clipboard.md#createwebclipboardsurface)가
소유하며, paste offset처럼 제품에 따라 달라지는 배치 정책은 Host가
`clipboard.paste` 전에 적용합니다.

## 상태의 주인

Object Hands는 서로 다른 수명의 상태를 한 덩어리로 만들지 않습니다.

- document state는 객체의 값과 기하를 보존합니다.
- editing session은 선택과 undo/redo를 보존합니다.
- host interaction state는 active tool, hover, drag, resize처럼 현재 조작만
  보존합니다.

객체를 만드는 작업이 끝나면 그 결과를 현재 선택으로 만듭니다. 예를 들어
`clipboard.paste`는 새 ID를 만든 뒤 `selectionAfter`에 그 ID를 넣습니다.
생성 도구를 제공하는 host는 명시적으로 잠그지 않은 한 Select로 돌아가되,
방금 만든 객체의 session selection은 유지합니다. 따라서 사용자는 생성 직후
같은 객체를 이동·resize·편집할 수 있고, 다음 빈 곳 입력으로 객체가 뜻하지
않게 하나 더 생기지 않습니다.

아래 Live Demo에서 Object와 그 손을 평면 위에 그린 Canvas를 함께 만질 수
있습니다. 빈 곳·객체·집합을 만지는
손은 [Affordance 평면](affordance.md#평면)을 따릅니다.

## Live Demo

```live-demo
/demo/object
```

```live-demo
/demo/canvas
```
