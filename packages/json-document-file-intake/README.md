# @interactive-os/json-document-file-intake

Platform-independent serializable file candidates, acceptance policy, and validation for json-document products.

```ts
import { formatFileSize, validateFileCandidates } from "@interactive-os/json-document-file-intake";

validateFileCandidates(files, {
  acceptedMediaTypes: ["image/*"],
  maxFiles: 4,
  maxBytesPerFile: 10_000_000,
});

formatFileSize(files[0].size);
```

## 포함된 이미지 내용

`RasterImageContent`는 `{ source: string, width: number, height: number }`인 JSON 값입니다.
`assertRasterImageSource(source)`는 PNG/JPEG/WebP base64 data URL 문법을,
`assertRasterImageContent(value)`는 같은 source와 양의 안전한 정수 치수를 검사합니다.
외부 URL·blob URL·SVG는 이 계약에 포함하지 않습니다. 파일 byte의 실제 decode와
픽셀/파일 수용 정책 적용은 별개이며, 문법 검사 성공이 decode 가능성을 보증하지 않습니다.

```ts
import { assertRasterImageContent } from "@interactive-os/json-document-file-intake";

assertRasterImageContent({ source: "data:image/png;base64,AQID", width: 100, height: 50 });
// 문법 예시이며 실제 PNG byte를 뜻하지 않습니다.
```

Object Document Type과 Composer가 이 내용을 각각 객체 source와 첨부 image에 사용합니다.
실제 이미지 읽기·표시·Undo의 Usage와 Source: [Canvas](/demo/canvas), [Composer](/demo/composer).
