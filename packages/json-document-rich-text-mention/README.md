# @interactive-os/json-document-rich-text-mention

Canonical `os.interactive/mention` schema and insertion commands for json-document Rich Text.

```ts
import { RICH_TEXT_MENTION_NODE, richTextMentionNodeSpec } from "@interactive-os/json-document-rich-text-mention";

const schema = createRichTextSchema({
  profile: "urn:example:editor:1",
  nodes: { [RICH_TEXT_MENTION_NODE]: richTextMentionNodeSpec },
});
```
