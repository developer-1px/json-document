# Clipboard

Selection과 Topology를 함께 읽으면 사용자가 고른 블록이나 셀을 정확한
순서로 얻을 수 있습니다. 이 데이터를 다른 위치나 다른 앱으로 옮기려면
구조와 텍스트 표현을 함께 담아야 합니다. Clipboard payload가 두 표현을
묶습니다.

## 선택한 내용 복사하기

Document editor에서 `copy()`를 호출하면 선택한 블록의 JSON과 일반 텍스트가
payload에 들어갑니다. Sheet는 선택한 셀의 JSON과 TSV를 만듭니다. 구조를
이해하는 편집기는 JSON을 사용하고, 일반 텍스트만 받는 앱은 text 또는 TSV를
사용할 수 있습니다.

```ts
const clipboard = editor.copy();

if (clipboard) {
  console.log(clipboard);
}
```

복사는 현재 값을 읽어 payload를 만들기 때문에 `document.value`와 History는
바뀌지 않습니다.

## 잘라내고 붙여넣기

잘라내기는 먼저 같은 payload를 만든 뒤 선택한 내용을 문서에서 제거합니다.
제거가 성공하면 History에 변경이 기록됩니다. 붙여넣기는 payload의 구조화된
데이터를 새 위치에 적용합니다.

```ts
const clipboard = editor.copy();

if (clipboard) {
  editor.dispatch({
    type: "clipboard.paste",
    clipboard,
  });
}
```

표에서 복사할 때는 [Topology](topology.md)를 함께 넘겨 현재 보이는 직사각형의
행과 열 순서를 유지합니다.

browser의 `copy`, `cut`, `paste` event에는 이 payload를 읽고 쓰는 과정이
추가됩니다. Web Connector가 event와 editor 메서드를 연결하고, 제품은 외부
plain text를 블록이나 셀로 해석할 규칙을 정합니다.

잘라내기와 붙여넣기로 생긴 문서 변경은 다른 편집과 같은 방식으로
기록됩니다. [History](history.md)에서는 이 기록이 값과 Selection을 어떻게
복원하는지 이어서 살펴봅니다.
