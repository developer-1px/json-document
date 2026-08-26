import { fileURLToPath } from "node:url";

export interface SourceAlias {
  find: string;
  replacement: string;
}

export function jsonDocumentSourceAliases(): SourceAlias[] {
  return [
    {
      find: "@interactive-os/json-document",
      replacement: sourceFile("packages/json-document/src/application/document/index.ts"),
    },
    {
      find: "@interactive-os/json-document-editing",
      replacement: sourceFile("packages/json-document-editing/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-selection",
      replacement: sourceFile("packages/json-document-selection/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-react",
      replacement: sourceFile("packages/json-document-react/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-react-hook-form",
      replacement: sourceFile("packages/json-document-react-hook-form/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-ajv",
      replacement: sourceFile("packages/json-document-ajv/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-affordance",
      replacement: sourceFile("packages/json-document-affordance/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-ui-primitives-react",
      replacement: sourceFile("packages/json-document-ui-primitives-react/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-zod",
      replacement: sourceFile("packages/json-document-zod/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-database/styles.css",
      replacement: sourceFile("packages/json-document-database/styles.css"),
    },
    {
      find: "@interactive-os/json-document-database",
      replacement: sourceFile("packages/json-document-database/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-annotation",
      replacement: sourceFile("packages/json-document-annotation/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-tanstack-table",
      replacement: sourceFile("packages/json-document-tanstack-table/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-web",
      replacement: sourceFile("packages/json-document-web/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-contenteditable",
      replacement: sourceFile("packages/json-document-contenteditable/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-contenteditable-collaboration",
      replacement: sourceFile("packages/contenteditable-collaboration/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-collaboration/text",
      replacement: sourceFile("packages/json-document-collaboration/src/text-index.ts"),
    },
    {
      find: "@interactive-os/json-document-collaboration",
      replacement: sourceFile("packages/json-document-collaboration/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-rich-text",
      replacement: sourceFile("packages/json-document-rich-text/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-file-intake",
      replacement: sourceFile("packages/json-document-file-intake/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-rich-text-suggestion-react",
      replacement: sourceFile("packages/json-document-rich-text-suggestion-react/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-rich-text-suggestion",
      replacement: sourceFile("packages/json-document-rich-text-suggestion/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-rich-text-mention",
      replacement: sourceFile("packages/json-document-rich-text-mention/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-rich-text-mention-react",
      replacement: sourceFile("packages/json-document-rich-text-mention-react/src/index.tsx"),
    },
    {
      find: "@interactive-os/json-document-composer",
      replacement: sourceFile("packages/json-document-composer/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-composer-react",
      replacement: sourceFile("packages/json-document-composer-react/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-rich-text-web",
      replacement: sourceFile("packages/json-document-rich-text-web/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-rich-text-react",
      replacement: sourceFile("packages/json-document-rich-text-react/src/index.tsx"),
    },
  ];
}

function sourceFile(path: string): string {
  return fileURLToPath(new URL(`../../${path}`, import.meta.url));
}
