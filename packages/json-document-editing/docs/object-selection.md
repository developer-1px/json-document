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

### 복제와 Clipboard

`object.duplicate`는 `objectIds` 집합을 문서 순서로 복제합니다. 생략한 `placement`는
`{ type: "offset", dx: 24, dy: 24 }`이며 Alt drag는 최종 delta를 명시합니다.
원본 형태·확장 필드·path points·상대 위치를 보존하고 새 ID를 할당합니다. 복제된
집합을 선택하고 기존 primary와 대응하는 사본을 primary로 삼습니다. source에 primary가
없으면 마지막 사본이 primary입니다. 반복 복제는 새 선택을 대상으로 같은 offset을 적용합니다.

`clipboard.paste`도 같은 ID 할당·변환·insert 경로를 사용합니다. placement 생략은 기존대로
zero offset입니다. Object/Canvas Hand의 native paste는 제품 정책으로 24단위 offset을
전달합니다. 같은 payload의 반복 paste는 같은 위치에 새 ID로 삽입하며 자동 cascade는 하지 않습니다.

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
