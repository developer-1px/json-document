## Placeholder stylesheet

```ts
import "@interactive-os/json-document-rich-text-react/placeholder.css";
```

`RichTextEditorSurface`의 `placeholder` 문구를 표시하는 정본 CSS입니다.
빈 문단의 `<br>`와 편집 DOM은 유지하고, 안내 문구만 절대 배치하여 가로 공간을 차지하지 않습니다.
따라서 빈 입력창의 커서가 안내 문구 끝으로 밀리지 않습니다. 안내 문구는 pointer event와 선택을 받지 않습니다.

`--rich-text-placeholder-color`로 색상을 지정할 수 있으며 기본은 `GrayText`입니다.
`ChatComposer` 스타일은 이 CSS를 포함합니다. 다른 Host는 위 subpath를 한 번 import합니다.
입력·삭제·전송 이후 empty 상태 판별은 기존 Rich Text render store가 소유합니다.

[Chat Usage](/demo/chat)와 [Composer Usage](/demo/composer)에서 같은 정본을 사용합니다.
각 Source 탭에서 `placeholder.css`를 확인할 수 있습니다.
