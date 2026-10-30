// Measures what a consumer pays for importing one public value export: minified bytes and
// the json-document modules that come along. Run after `npm run build` (it bundles dist).
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { libraries, repositoryRoot } from "./workspace-graph.mjs";

const external = ["react", "react-dom", "react/jsx-runtime", "react-dom/client"];
const results = [];

for (const library of libraries) {
  const manifest = library.manifest;
  for (const [subpath, target] of Object.entries(manifest.exports ?? { ".": manifest.main })) {
    if (subpath.endsWith(".css") || subpath === "./package.json") continue;
    const specifier = subpath === "." ? manifest.name : `${manifest.name}/${subpath.slice(2)}`;
    const module = await import(specifier).catch(() => null);
    if (module === null) continue;
    for (const name of Object.keys(module).sort()) {
      const outcome = await build({
        stdin: { contents: `export { ${name} } from "${specifier}";`, resolveDir: repositoryRoot, loader: "js" },
        bundle: true, write: false, minify: true, format: "esm", platform: "browser", metafile: true,
        external, logLevel: "silent", loader: { ".css": "empty" },
      }).catch((error) => ({ error }));
      if ("error" in outcome) { results.push({ specifier, name, error: String(outcome.error.message ?? outcome.error).split("\n")[0] }); continue; }
      const inputs = Object.keys(outcome.metafile.inputs);
      const own = inputs.filter((path) => path.includes("packages/")).map((path) => relative(repositoryRoot, join(repositoryRoot, path)));
      results.push({
        specifier, name,
        bytes: outcome.outputFiles[0].contents.byteLength,
        modules: own.length,
        packages: [...new Set(own.map((path) => path.split("/")[1]))].sort(),
        thirdParty: [...new Set(inputs.filter((path) => path.includes("node_modules/")).map((path) => path.split("node_modules/").at(-1).split("/").slice(0, path.split("node_modules/").at(-1).startsWith("@") ? 2 : 1).join("/")))].sort(),
      });
    }
  }
}

const output = process.argv[2] ?? join(repositoryRoot, "closure-report.json");
writeFileSync(output, JSON.stringify(results, null, 2) + "\n");
console.log(`closure report: ${results.length} exports → ${relative(process.cwd(), output)}`);
