export type AdapterCatalogEntry = {
  readonly id: "keyboard" | "clipboard" | "contenteditable";
  readonly name: string;
  readonly packageName: string;
  readonly description: string;
  readonly status: "available" | "planned";
  readonly demoPath: string;
};

export const adapterCatalog: ReadonlyArray<AdapterCatalogEntry> = [
  {
    id: "keyboard",
    name: "Keyboard",
    packageName: "@interactive-os/json-document-web",
    description: "Official keyboard adapter. Conventional chords become semantic commands, then existing Intent, Clipboard, and History doors.",
    status: "available",
    demoPath: "/adapters/keyboard",
  },
  {
    id: "clipboard",
    name: "Clipboard",
    packageName: "@interactive-os/json-document-web",
    description: "Official clipboard adapter. Native ClipboardEvent copy, cut, and paste bind to editor clipboard contracts.",
    status: "available",
    demoPath: "/adapters/clipboard",
  },
  {
    id: "contenteditable",
    name: "Contenteditable",
    packageName: "@interactive-os/json-document-contenteditable",
    description: "Official DOM adapter. A React contenteditable root leases native input for one JSON Document string pointer.",
    status: "available",
    demoPath: "/adapters/contenteditable",
  },
];
