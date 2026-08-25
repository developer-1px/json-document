# @interactive-os/json-document-file-intake

Platform-independent serializable file candidates, acceptance policy, and validation for json-document products.

```ts
import { validateFileCandidates } from "@interactive-os/json-document-file-intake";

validateFileCandidates(files, {
  acceptedMediaTypes: ["image/*"],
  maxFiles: 4,
  maxBytesPerFile: 10_000_000,
});
```
