import { siteRoutes } from "../../route-registry.mjs";
export { legacyPageRedirects } from "./legacy-page-redirects";

export type SiteNavigationGroup =
  | "Design"
  | "Introduction"
  | "JSON Document"
  | "Document Types"
  | "Collaboration"
  | "Editing"
  | "Hands"
  | "Artifact"
  | "Adapter"
  | "Connector"
  | "Affordance"
  | "UI Primitives"
  | "Applications";
export type IntegrationKind = "adapter" | "connector";

export type SiteRoute = {
  readonly path: string;
  readonly label: string;
  readonly title: string;
  readonly heading?: string;
  readonly documentSource?: string;
  readonly documentIncludes?: readonly string[];
  readonly description: string;
  readonly language?: "en" | "ko";
  readonly navigationGroup?: SiteNavigationGroup;
  readonly parentPath?: string;
  readonly sidebar?: false;
  readonly chrome?: "app" | "none";
  readonly relatedDemoPath?: string;
  readonly relatedDemoLabel?: string;
  readonly module?: {
    readonly packageName: string;
    readonly sourceDirectory: string;
    readonly responsibility: string;
    readonly alsoIn: readonly SiteNavigationGroup[];
    readonly usagePaths: readonly string[];
    readonly statusNote?: string;
  };
  readonly applicationSource?: string;
  readonly modulePaths?: readonly string[];
  readonly integration?: {
    readonly kind: IntegrationKind;
    readonly packageName: string;
  };
};

export const pageDescriptors = siteRoutes;

export function pageDescriptor(path: string): SiteRoute {
  const descriptor = pageDescriptors.find((route) => route.path === path);
  if (descriptor === undefined) throw new Error(`Unknown public page descriptor: ${path}`);
  return descriptor;
}

export function integrationPageDescriptors(kind: IntegrationKind): ReadonlyArray<SiteRoute> {
  return pageDescriptors.filter((route) => route.integration?.kind === kind);
}

export function isAppChrome(route: SiteRoute | undefined): boolean {
  return route?.chrome === "app";
}
