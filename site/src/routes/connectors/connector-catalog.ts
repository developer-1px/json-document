export type ConnectorCatalogEntry = {
  readonly id: "react" | "react-hook-form" | "ajv" | "zod" | "tanstack-table";
  readonly name: string;
  readonly packageName: string;
  readonly description: string;
  readonly status: "available" | "planned";
  readonly demoPath: string | null;
  readonly moreDemos?: ReadonlyArray<{
    readonly path: string;
    readonly label: string;
  }>;
};

export const connectorCatalog: ReadonlyArray<ConnectorCatalogEntry> = [
  {
    id: "react",
    name: "React",
    packageName: "@interactive-os/json-document-react",
    description: "External-store subscription and component-owned editor lifecycle.",
    status: "available",
    demoPath: "/connectors/react",
  },
  {
    id: "react-hook-form",
    name: "React Hook Form",
    packageName: "@interactive-os/json-document-react-hook-form",
    description: "Form drafts and field lifecycle connected to canonical commits and history.",
    status: "available",
    demoPath: "/connectors/react-hook-form",
  },
  {
    id: "ajv",
    name: "Ajv",
    packageName: "@interactive-os/json-document-ajv",
    description: "Compiled Ajv validators translated into synchronous JSON Document diagnostics.",
    status: "available",
    demoPath: "/connectors/ajv",
  },
  {
    id: "zod",
    name: "Zod",
    packageName: "@interactive-os/json-document-zod",
    description: "Zod object schemas translated into Database admin documents.",
    status: "available",
    demoPath: "/connectors/zod",
    moreDemos: [{ path: "/connectors/zod/validate", label: "Validate commits" }],
  },
  {
    id: "tanstack-table",
    name: "TanStack Table",
    packageName: "@interactive-os/json-document-tanstack-table",
    description: "Headless table rows and cell commits connected to JSON Patch.",
    status: "available",
    demoPath: "/connectors/tanstack-table",
  },
];
