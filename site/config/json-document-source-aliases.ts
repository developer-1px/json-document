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
      find: "@interactive-os/json-document-zod",
      replacement: sourceFile("packages/json-document-zod/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-tanstack-table",
      replacement: sourceFile("packages/json-document-tanstack-table/src/index.ts"),
    },
    {
      find: "@interactive-os/json-document-web",
      replacement: sourceFile("packages/json-document-web/src/index.ts"),
    },
  ];
}

function sourceFile(path: string): string {
  return fileURLToPath(new URL(`../../${path}`, import.meta.url));
}
