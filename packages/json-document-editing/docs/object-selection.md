## Object Selection · primary와 집합 편집

`selection.set`은 `objectIds`, `mode`와 선택적인 `primaryKey`를 받습니다.
`primaryKey`를 생략하면 Selection key family의 기본 전이를 사용합니다.
명시하면 **전이 후 선택 집합에 포함된 key**여야 하며, 아니면
`selection.primary-not-selected`로 기존 상태·문서·History를 보존합니다.

`object.translate`, `object.resize`, `object.text`의 대상이 현재 선택의 부분집합이면
선택 집합과 primary를 보존합니다. 선택 밖 대상을 직접 지정하면 기존대로 그 대상을
선택합니다. 따라서 전체 선택 이동, primary만 resize/text 편집을 같은 ObjectEditor로
실행할 수 있습니다. 문서 연산·검증은 Object Document Type이 소유합니다.

```ts
editor.dispatch({ type: "selection.set", objectIds: ["a", "b"], primaryKey: "a" });
editor.dispatch({ type: "object.translate", objectIds: ["a", "b"], dx: 20, dy: 10 });
editor.dispatch({ type: "object.resize", objectIds: ["a"], dx: 0, dy: 0, dw: 10, dh: 0 });
```

선택은 문서 밖의 Editing session 상태입니다. 선택 전이는 문서 commit이나 Undo 기록을
만들지 않고 redo도 제거하지 않습니다. 집합 이동·삭제는 객체마다 dispatch하지 않고 하나의
Intent를 사용합니다. Undo/Redo는 해당 문서 변경과 함께 원인 선택 집합·primary를 복원합니다.

실제 public API 소비: [Canvas Usage와 Source](/demo/canvas).

### 선택 스타일

`selection.style`은 `{ style: Partial<ObjectStyle> }`을 받아 선택한 객체에 한 번 적용합니다.
스타일의 값·기본값·종류별 지원 여부·검증은 [Object Document Type](/docs/api/object-document)의
`style` 연산에 위임합니다. 예를 들어 글자·도형·이미지를 함께 선택한 뒤 fontSize를 바꾸면
글자만 바뀌며 이미지와 선택 집합·primary는 유지됩니다.

```ts
editor.dispatch({ type: "selection.style", style: { color: "#3b82f6", fontSize: 48, fontWeight: 700 } });
```

한 번의 변경은 한 번의 commit/Undo입니다. Undo/Redo는 그때의 선택도 복원합니다.
같은 유효값과 지원 대상이 없는 속성은 문서·History·redo branch를 바꾸지 않습니다.
일반 Editing session의 관찰 revision 의미는 그대로이며 no-op publication을 금지하는
계약은 아닙니다. 빈 선택은 `selection.empty`, 잘못된 스타일은 실패를 반환합니다.
복제·Clipboard·JSON은 저장된 스타일 필드를 그대로 보존합니다. 기존 `selection.fill`은
종류에 관계없이 color를 쓰는 호환 동작을 유지합니다.

### 복제와 Clipboard

`object.duplicate`는 `objectIds` 집합을 문서 순서로 복제합니다. 생략한 `placement`는
`{ type: "offset", dx: 24, dy: 24 }`이며 Alt drag는 최종 delta를 명시합니다.
원본 형태·확장 필드·path points·상대 위치를 보존하고 새 ID를 할당합니다. 복제된
집합을 선택하고 기존 primary와 대응하는 사본을 primary로 삼습니다. source에 primary가
없으면 마지막 사본이 primary입니다. 반복 복제는 새 선택을 대상으로 같은 offset을 적용합니다.

`clipboard.paste`도 같은 ID 할당·변환·insert 경로를 사용합니다. placement 생략은 기존대로
zero offset입니다. `{ type: "offset", dx, dy }`는 명시 좌표를 유지하고,
`{ type: "cascade", dx, dy }`는 첫 source 객체의 시작점에 1배, 2배… delta를 적용하여
기존 객체의 시작점과 일치하지 않는 첫 위치를 찾습니다. 모든 사본에 같은 delta를 적용합니다.
Object/Canvas native paste는 cascade 24/24를 사용합니다. Undo/삭제 후에는 빈 위치를
재사용하므로 횟수 counter가 없습니다. 직사각형 충돌 회피·snap·슬라이드 내부 배치는 아닙니다.
0/0 cascade, 비유한 delta, 계산 overflow는 거절합니다. 기존 offset API는 그대로입니다.

`ObjectClipboard`는 구조화 MIME `application/vnd.interactive-os.objects+json`, `objects`,
`text`와 선택적인 `primaryKey`를 갖습니다. `copy()`는 문서 순서의 객체·label을 결합한 text와
primary를 투영할 뿐 OS clipboard에 쓰지 않습니다. `objectClipboardFormat.parse`는
legacy primary 없는 payload도 수용하고, 있으면 복사된 집합의 ID 또는 null인지 검증합니다.
paste는 primary를 새 ID로 remap합니다. 기존 문서와 source 양쪽 ID를 재사용하지 않습니다.

```ts
editor.dispatch({ type: "object.duplicate", objectIds: editor.snapshot.selection.keys });
const captured = editor.copy();
// Web write가 성공한 뒤에만, 현재 선택을 다시 읽지 않고 캡처된 대상 제거:
if (captured) editor.dispatch({ type: "object.remove", objectIds: captured.objects.map((object) => object.id) });
```

`object.remove`는 명시한 ID 집합을 제거합니다. `selection.remove`와 같은 원자적 연산을
사용하며, 일부 ID가 없으면 전체 거절합니다. `cut()`은 OS 이벤트 밖의 headless 명령이므로
브라우저에서는 Web binding으로 **write → captured 대상 remove** 순서를 보장해야 합니다.

복제·paste·remove는 명령당 하나의 commit/Undo입니다. ID 할당 불가, 잘못된 offset이나
payload, 대상/프로파일 위반은 부분 문서·선택·History를 남기지 않습니다. Canvas의 strict
profile은 generic Object clipboard라도 결과가 유효한 경우만 삽입합니다.

### 외부 Canvas 내용과 비동기 paste

`createCanvasClipboard(content, options)`는 `{ type: "text", text }` 또는
`{ type: "images", images: [{ source, width, height, label }] }`를 ObjectClipboard로 바꿉니다.
문자열은 줄바꿈과 Unicode를 보존하며 HTML로 해석하지 않습니다. 텍스트의 초기 상자는 bounds와
fontSize로 결정하고, 이미지는 Object Document Type의 `createCanvasImage`로 맞춥니다.
여러 이미지는 `imageOffset`(기본 24)만큼 분산합니다. `clipboard:0` 같은 임시 source ID는
payload 내부 식별자일 뿐이며 실제 문서 ID는 paste commit 때만 할당합니다.

```ts
import { createCanvasClipboard, createObjectPasteSession } from "@interactive-os/json-document-editing";

const pastes = createObjectPasteSession(editor, {
  placement: { type: "cascade", dx: 24, dy: 24 },
  onResult: showEditingResult,
  onPendingChange: showPending,
});
pastes.enqueue(() => ({ ok: true, clipboard: createCanvasClipboard({ type: "text", text: "안녕\nCanvas" }, {
  bounds: { x: 0, y: 0, width: 960, height: 540 }, textColor: "black", fontSize: 36,
}) }));
```

`enqueue(prepare, cancelPreparation?)`는 동기 결과 또는 Promise를 받아 요청 순서로
채택합니다. 준비 결과는 `{ ok: true, clipboard }` 또는 `{ ok: false, code, reason? }`입니다.
준비는 병행할 수 있지만 앞 요청이 끝나기 전에 뒤 요청이 commit되지 않습니다. 실패한 요청은
문서·ID·History를 만들지 않으며 다음 요청을 막지 않습니다. 동기 payload는 대기 요청이 없으면
동기 commit하고 반환 Promise는 해당 EditingResult로 완료됩니다.

`pending`, `onPendingChange`, `onResult`로 상태/결과를 관찰합니다. 외부 문서·선택 변경과
`cancel()`은 대기 전체를 `clipboard.cancelled`로 완료하고 취소 callback을 부릅니다.
취소된 작업의 늦은 결과는 commit/`onResult`를 호출하지 않습니다. `cancel()`은 구독을
해제하며 같은 session을 다시 사용할 수 있으므로 Hand cleanup에서도 호출합니다.
이 세션은 DOM, React, FileReader를 모르고 Canvas에 한정되지 않습니다.

실제 연결은 [Canvas Usage/Source](/demo/canvas)의 Canvas Clipboard binding에서 볼 수 있습니다.
