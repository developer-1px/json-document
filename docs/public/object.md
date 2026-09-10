# Object

Object는 안정된 ID를 가진 객체를 집는 편집기입니다. 줄 번호가 아니라 키
가족(key family)을 씁니다. 문서 모델·검증·연산은
[`Object Document Type`](/docs/api/object-document), 입력·기하의 UI 조합은
[`Canvas Hand`](/docs/api/canvas)가 소유하고 editor에는 객체 ID와 Intent를 넘깁니다.

생성·글자 편집·색 채우기·이동·resize·삭제는 Intent로 들어갑니다. 문서의 기하
규칙은 Document Type이, 화면 좌표와 hit target은 Adapter와 Hand가 소유합니다.
Canvas의 스티커 노트와 도형 내부 글도 별도 편집기 없이 같은 `object.text`로
label을 바꿉니다. 채워진 객체의 본문 글자색은 `selection.style`의 `style.textColor`로,
채우기는 기존 `color`로 구분합니다.

## API Reference

### `createObjectEditor(source, options?)`

Object document의 editing session을 만듭니다. 반환된 `ObjectEditor`는
`snapshot`, `selectedObjects`, `dispatch`, `copy`, `cut`, `undo`, `redo`,
`subscribe`를 공개합니다. `source`는 `ObjectDocument` 또는 기존
`JSONDocument<ObjectDocument>`이며, `options.createId`는 paste가 만드는 객체의
ID 정책을 Host가 주입하는 자리입니다.

### `ObjectIntent`

`dispatch`가 받는 Object domain command입니다. 공개 variant는
`selection.set`, `selection.remove`, `selection.fill`, `selection.style`, `object.create`, `object.text`,
`object.translate`, `object.resize`, `object.duplicate`, `object.remove`, `document.replace`, `clipboard.paste`입니다. DOM event, pointer 좌표, clipboard
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
`clipboard.paste.placement`의 `{ type: "offset", dx, dy }`로 전달합니다. Editor가
unique ID clone 뒤 placement를 정확히 한 번 적용하므로 clipboard payload에는
배치 결과를 미리 저장하지 않습니다. placement 생략은 zero offset입니다.
복제·paste의 primary remap, 새 ID와 원자적 History 계약은 소유 패키지의
[Object Editing API](/docs/api/editing)에 있습니다. native cut은 성공적으로 쓴 payload의
ID를 `object.remove`에 전달합니다. Object Demo의 복제 버튼은 OS Clipboard와 별개이며
copy/cut/paste는 native 이벤트만 사용합니다.

## 상태의 주인

Object Hands는 서로 다른 수명의 상태를 한 덩어리로 만들지 않습니다.

- document state는 객체의 값과 기하를 보존합니다.
- editing session은 선택과 undo/redo를 보존합니다.
- Hand interaction state는 active tool, text draft, drag, resize처럼 현재 조작만
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

[한 장짜리 Canvas의 Usage와 Source](/docs/api/canvas)는 별도 Canvas editor 없이
이 Object Editing을 사용합니다. Canvas UI는 같은 다중 선택·Clipboard API와
Affordance의 평면 Select 프로파일을 연결합니다.
