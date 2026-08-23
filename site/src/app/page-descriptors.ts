import siteRoutesJson from "../../site-routes.json";
export { legacyPageRedirects } from "./legacy-page-redirects";

export type SiteNavigationGroup =
  | "JSON Document"
  | "Collaboration"
  | "Editing"
  | "Hands"
  | "Artifact"
  | "Adapter"
  | "Connector"
  | "Affordance";
export type IntegrationKind = "adapter" | "connector";

export type SiteRoute = {
  readonly path: string;
  readonly label: string;
  readonly title: string;
  readonly heading?: string;
  readonly description: string;
  readonly language?: "en" | "ko";
  readonly navigationGroup?: SiteNavigationGroup;
  readonly parentPath?: string;
  readonly sidebar?: false;
  readonly relatedDemoPath?: string;
  readonly relatedDemoLabel?: string;
  readonly integration?: {
    readonly kind: IntegrationKind;
    readonly packageName: string;
  };
};

export const pageDescriptors = siteRoutesJson as ReadonlyArray<SiteRoute>;

export function pageDescriptor(path: string): SiteRoute {
  const descriptor = pageDescriptors.find((route) => route.path === path);
  if (descriptor === undefined) throw new Error(`Unknown public page descriptor: ${path}`);
  return descriptor;
}

export function integrationPageDescriptors(kind: IntegrationKind): ReadonlyArray<SiteRoute> {
  return pageDescriptors.filter((route) => route.integration?.kind === kind);
}
