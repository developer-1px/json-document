import modules from "../../architecture/modules.json" with { type: "json" };
import { siteRoutes } from "../../site/route-registry.mjs";

export const apiReferencePackages = modules.map(owner => {
  const route = siteRoutes.find(route => route.module?.packageName === owner.packageName);
  if (!route) throw new Error(`API route missing: ${owner.packageName}`);
  return {
    ...owner,
    slug: route.path.slice("/docs/api/".length),
    navigationGroup: owner.positions[0],
  };
});

export function apiReferenceCoverageErrors(manifests, references = apiReferencePackages) {
  const expected = manifests.filter((manifest) => !manifest.private).flatMap((manifest) =>
    Object.entries(manifest.exports).filter(([, target]) => hasTypes(target))
      .map(([subpath]) => subpath === "." ? manifest.name : `${manifest.name}/${subpath.slice(2)}`));
  const registered = references.flatMap(({ packageName, subpaths }) =>
    [packageName, ...subpaths.map((subpath) => subpath.packageName)]);
  return [
    ...expected.filter((name) => !registered.includes(name)).map((name) => `API reference missing: ${name}`),
    ...registered.filter((name) => !expected.includes(name)).map((name) => `API reference is not public: ${name}`),
    ...registered.filter((name, index) => registered.indexOf(name) !== index).map((name) => `Duplicate API reference: ${name}`),
  ];
}

function hasTypes(target) {
  return target !== null && typeof target === "object"
    && (typeof target.types === "string" || Object.values(target).some(hasTypes));
}
