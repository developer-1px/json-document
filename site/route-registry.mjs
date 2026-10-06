import routes from "./site-routes.json" with { type: "json" };
import modules from "../architecture/modules.json" with { type: "json" };

/** Project repository responsibilities into site navigation, never the reverse. */
export function resolveSiteRoutes(pages, owners) {
  return pages.map(page => {
    if (!page.module) return page;
    const owner = owners.find(module => module.packageName === page.module.packageName);
    if (!owner) throw new Error(`Unknown architecture module: ${page.module.packageName}`);
    if (page.navigationGroup !== undefined || page.documentSource !== undefined || Object.keys(page.module).some(key => !["packageName", "usagePaths"].includes(key))) {
      throw new Error(`Site route duplicates architecture ownership: ${page.path}`);
    }
    return {
      ...page,
      navigationGroup: owner.positions[0],
      documentSource: owner.referencePath,
      module: {
        packageName: owner.packageName,
        sourceDirectory: owner.sourceDirectory,
        responsibility: owner.responsibility,
        alsoIn: owner.positions.slice(1),
        usagePaths: page.module.usagePaths,
        ...(owner.statusNote ? { statusNote: owner.statusNote } : {}),
      },
    };
  });
}

export const siteRoutes = resolveSiteRoutes(routes, modules);
