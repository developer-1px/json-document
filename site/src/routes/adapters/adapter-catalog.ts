import { integrationPageDescriptors } from "../../app/page-descriptors";

export type AdapterCatalogEntry = {
  readonly id: string;
  readonly name: string;
  readonly packageName: string;
  readonly description: string;
  readonly status: "available" | "planned";
  readonly demoPath: string;
};

export const adapterCatalog: ReadonlyArray<AdapterCatalogEntry> =
  integrationPageDescriptors("adapter").map((descriptor) => ({
    id: descriptor.path.slice("/adapters/".length),
    name: descriptor.label,
    packageName: descriptor.integration!.packageName,
    description: descriptor.description,
    status: descriptor.integration!.status,
    demoPath: descriptor.path,
  }));
