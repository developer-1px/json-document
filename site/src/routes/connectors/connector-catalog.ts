import { integrationPageDescriptors, pageDescriptors } from "../../app/page-descriptors";

export type ConnectorCatalogEntry = {
  readonly id: string;
  readonly name: string;
  readonly packageName: string;
  readonly description: string;
  readonly status: "available" | "planned";
  readonly demoPath: string;
  readonly moreDemos: ReadonlyArray<{
    readonly path: string;
    readonly label: string;
  }>;
};

export const connectorCatalog: ReadonlyArray<ConnectorCatalogEntry> =
  integrationPageDescriptors("connector").map((descriptor) => ({
    id: descriptor.path.slice("/connectors/".length),
    name: descriptor.label,
    packageName: descriptor.integration!.packageName,
    description: descriptor.description,
    status: descriptor.integration!.status,
    demoPath: descriptor.path,
    moreDemos: pageDescriptors
      .filter((candidate) => candidate.parentPath === descriptor.path)
      .map(({ path, label, relatedDemoLabel }) => ({ path, label: relatedDemoLabel ?? label })),
  }));
