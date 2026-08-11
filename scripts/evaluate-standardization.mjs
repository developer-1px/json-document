import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function read(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

function json(path) {
  return JSON.parse(read(path));
}

function fail(message) {
  failures.push(message);
}

function equal(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function setEqual(label, actual, expected) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  for (const value of expectedSet) {
    if (!actualSet.has(value)) fail(`${label}: missing ${value}.`);
  }
  for (const value of actualSet) {
    if (!expectedSet.has(value)) fail(`${label}: unexpected ${value}.`);
  }
}

function requirePattern(label, source, pattern) {
  if (!pattern.test(source)) fail(`${label}: missing ${pattern}.`);
}

function publicExports(source) {
  const values = [];
  const types = [];
  for (const match of source.matchAll(/\bexport\s+(type\s+)?\{([^}]*)\}/g)) {
    const target = match[1] === undefined ? values : types;
    target.push(
      ...match[2]
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const normalized = part.replace(/^type\s+/, "");
          return normalized.match(/\s+as\s+([A-Za-z_$][\w$]*)$/)?.[1]
            ?? normalized.split(/\s+/)[0];
        }),
    );
  }
  return {
    values: [...new Set(values)].sort(),
    types: [...new Set(types)].sort(),
  };
}

function interfaceMembers(source, interfaceName) {
  const header = `export interface ${interfaceName} {`;
  const start = source.indexOf(header);
  if (start === -1) {
    fail(`declaration: ${interfaceName} was not found.`);
    return [];
  }

  const bodyStart = start + header.length;
  let bodyEnd = -1;
  let depth = 1;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) {
      bodyEnd = index;
      break;
    }
  }
  if (bodyEnd === -1) {
    fail(`declaration: ${interfaceName} is not closed.`);
    return [];
  }

  const members = [];
  let parentheses = 0;
  let braces = 0;
  let brackets = 0;
  for (const line of source.slice(bodyStart, bodyEnd).split("\n")) {
    if (parentheses === 0 && braces === 0 && brackets === 0) {
      const name = /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*(?=[:(])/.exec(line)?.[1];
      if (name !== undefined) members.push(name);
    }
    for (const character of line) {
      if (character === "(") parentheses += 1;
      if (character === ")") parentheses -= 1;
      if (character === "{") braces += 1;
      if (character === "}") braces -= 1;
      if (character === "[") brackets += 1;
      if (character === "]") brackets -= 1;
    }
  }
  return members;
}

function assertGenericSuite(label, source, harnessPattern) {
  if (
    /@interactive-os\/json-document|from\s+["']zod["']|\/src\//.test(source)
  ) {
    fail(`${label}: injected suite must be implementation and provider independent.`);
  }
  requirePattern(label, source, harnessPattern);
}

function assertPublicBinding(label, source, pattern) {
  if (!/from "@interactive-os\/json-document"/.test(source)) {
    fail(`${label}: binding must import the public root package.`);
  }
  if (/from ["'][^"']*(?:\/src\/|domain\/|foundation\/)|\/src\//.test(source)) {
    fail(`${label}: private source path leaked.`);
  }
  requirePattern(label, source, pattern);
}

const manifest = json("docs/standard/v3-public-surface.json");
const profile = read("docs/standard/v3-json-document-profile.md");
const packageContract = json("packages/json-document/public-contract.json");
const packageManifest = json("packages/json-document/package.json");
const buildConfig = json("packages/json-document/tsconfig.json");
const rootSource = read("packages/json-document/src/application/document/index.ts");
const contractSource = read("packages/json-document/src/application/document/contract.ts");

if (manifest.formatVersion !== 1 || manifest.status !== "stable") {
  fail("v3 manifest: expected formatVersion 1 and stable status.");
}
if (manifest.sourceContract !== "packages/json-document/public-contract.json#root") {
  fail("v3 manifest: sourceContract must point to the root public contract.");
}
equal("v3 package identity", {
  name: manifest.package?.name,
  version: manifest.package?.version,
  entrypoint: manifest.package?.entrypoint,
}, {
  name: packageManifest.name,
  version: packageManifest.version,
  entrypoint: ".",
});
equal(
  "v3 excluded entrypoints",
  manifest.package?.excludedEntrypoints,
  ["./session", "./react"],
);
equal("v3 runtime dependencies", manifest.package?.runtimeDependencies, []);
equal("v3 peer dependencies", manifest.package?.peerDependencies, []);

equal("public contract entrypoints", Object.keys(packageContract), ["root"]);

const sourceExports = publicExports(rootSource);
equal("root source values", sourceExports.values, [...packageContract.root.values].sort());
equal("root source types", sourceExports.types, [...packageContract.root.types].sort());
equal(
  "JSONDocument members",
  interfaceMembers(contractSource, "JSONDocument"),
  manifest.documentMembers,
);

equal("package entrypoints", Object.keys(packageManifest.exports ?? {}), ["."]);
equal("package export conditions", packageManifest.exports?.["."], {
  types: "./dist/application/document/index.d.ts",
  import: "./dist/application/document/index.js",
});
if (packageManifest.main !== packageManifest.exports?.["."].import) {
  fail("package: main must equal the root import target.");
}
if (packageManifest.types !== packageManifest.exports?.["."].types) {
  fail("package: types must equal the root declaration target.");
}
for (const field of [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
]) {
  if (packageManifest[field] !== undefined) {
    fail(`package: ${field} must be absent from the v3 kernel.`);
  }
}
equal(
  "package files",
  packageManifest.files,
  ["dist", "README.md", "public-contract.json", "LICENSE"],
);
equal(
  "production build roots",
  buildConfig.include,
  ["src/application/document/index.ts"],
);

const documentedRequirements = [
  ...profile.matchAll(/\bJD3-[A-Z]+-\d{3}\b/g),
].map((match) => match[0]);
if (documentedRequirements.length !== new Set(documentedRequirements).size) {
  fail("v3 profile: every requirement ID must appear exactly once.");
}
setEqual(
  "v3 requirements",
  documentedRequirements,
  manifest.requirements ?? [],
);
for (const word of ["MUST", "SHOULD", "MAY"]) {
  requirePattern("v3 profile normative language", profile, new RegExp(`\\b${word}\\b`));
}
for (const pattern of [
  /stateless JSON Patch -> JSON Document -> host adapter/,
  /root entrypoint 하나와 21개 symbol/,
  /runtime dependency와 peer dependency가 없다/,
  /제거된 `\/session`과\s*`\/react` implementation은 export가 아니며 production build와 tarball에\s*포함하지 않는다/,
]) {
  requirePattern("v3 profile package closure", profile, pattern);
}

for (const path of Object.values(manifest.conformance)) {
  if (!existsSync(join(repoRoot, path))) fail(`v3 conformance artifact missing: ${path}.`);
}

const jsonDocumentVectors = json(manifest.conformance.jsonDocumentVectors);
const protocolVectors = json(manifest.conformance.protocolVectors);
const pointerVectors = json(manifest.conformance.pointerVectors);
const jsonDocumentSuite = read(manifest.conformance.jsonDocumentSuite);
const jsonDocumentBinding = read(manifest.conformance.jsonDocumentBinding);
const protocolSuite = read(manifest.conformance.protocolSuite);
const protocolBinding = read(manifest.conformance.protocolBinding);
const pointerSuite = read(manifest.conformance.pointerSuite);
const pointerBinding = read(manifest.conformance.pointerBinding);
const rfc6902Suite = read(manifest.conformance.rfc6902Suite);
const rfc6902Binding = read(manifest.conformance.rfc6902Binding);
const jsonPathSuite = read(manifest.conformance.jsonPathSuite);
const jsonPathBinding = read(manifest.conformance.jsonPathBinding);
const foundationVectors = json(manifest.conformance.foundationVectors);
const pressureVectors = json(manifest.conformance.pressureVectors);
const pressureSuite = read(manifest.conformance.pressureSuite);
const independentJSONDocumentImplementation = read(
  manifest.conformance.independentJSONDocumentImplementation,
);
const independentJSONDocumentBinding = read(
  manifest.conformance.independentJSONDocumentBinding,
);
const collaborationJSONDocumentBinding = read(
  manifest.conformance.collaborationJSONDocumentBinding,
);

for (const [label, vectors] of [
  ["json-document", jsonDocumentVectors],
  ["protocol", protocolVectors],
  ["pointer", pointerVectors],
  ["foundation", foundationVectors],
  ["pressure", pressureVectors],
]) {
  if (
    vectors.formatVersion !== 1
    || vectors.status !== "stable"
    || vectors.profile !== "docs/standard/v3-json-document-profile.md"
  ) {
    fail(`${label} vectors: metadata drifted.`);
  }
}
equal(
  "json-document vector members",
  jsonDocumentVectors.documentMembers,
  manifest.documentMembers,
);
if (protocolVectors.function !== "applyPatch") {
  fail("protocol vectors: function must be applyPatch.");
}
equal(
  "pointer vector requirements",
  pointerVectors.requirements,
  ["JD3-ADDRESS-001", "JD3-PATCH-001"],
);
for (const group of ["parse", "invalid", "build", "append", "parent", "track"]) {
  if (!Array.isArray(pointerVectors[group]) || pointerVectors[group].length === 0) {
    fail(`pointer vectors: ${group} must be non-empty.`);
  }
}

const requirementSet = new Set(manifest.requirements ?? []);
const runtimeRequirements = new Set();
const allowedVectorKinds = {
  "json-document": new Set([
    "surface",
    "read",
    "commit",
    "unsubscribe",
    "unsubscribe-during-notification",
    "isolation",
    "non-json",
    "reentrant-notification",
    "subscriber-error",
  ]),
  protocol: new Set([
    "patch",
    "extra-fields",
    "non-json-state",
    "non-json-payload",
    "precedence",
    "isolation",
  ]),
};
for (const [suiteName, vectors] of [
  ["json-document", jsonDocumentVectors.vectors ?? []],
  ["protocol", protocolVectors.vectors ?? []],
]) {
  const vectorIds = new Set();
  for (const vector of vectors) {
    if (typeof vector.id !== "string" || vector.id.trim() === "") {
      fail(`${suiteName} vectors: every vector needs an id.`);
    } else if (vectorIds.has(vector.id)) {
      fail(`${suiteName} vectors: duplicate id ${vector.id}.`);
    } else {
      vectorIds.add(vector.id);
    }
    if (!allowedVectorKinds[suiteName].has(vector.kind)) {
      fail(`${suiteName} vectors: ${vector.id} has unknown kind ${vector.kind}.`);
    }
    if (!Array.isArray(vector.requirements) || vector.requirements.length === 0) {
      fail(`${suiteName} vectors: ${vector.id} needs requirement traceability.`);
    }
    for (const id of vector.requirements ?? []) {
      if (!requirementSet.has(id)) {
        fail(`${suiteName} vectors: ${vector.id} references unknown ${id}.`);
      }
      runtimeRequirements.add(id);
    }
  }
}
const pressureVerticals = pressureVectors.verticals ?? [];
setEqual(
  "pressure verticals",
  pressureVerticals.map((vertical) => vertical.id),
  [
    "form",
    "table-data-grid",
    "outliner-tree",
    "rich-text",
    "storage-collaboration",
  ],
);
for (const vertical of pressureVerticals) {
  if (
    !Array.isArray(vertical.requirements)
    || !vertical.requirements.includes("JD3-CONFORMANCE-002")
  ) {
    fail(`pressure vectors: ${vertical.id} must trace JD3-CONFORMANCE-002.`);
  }
  for (const id of vertical.requirements ?? []) {
    if (!requirementSet.has(id)) {
      fail(`pressure vectors: ${vertical.id} references unknown ${id}.`);
    }
    runtimeRequirements.add(id);
  }
}
if (
  !Array.isArray(foundationVectors.arrayIndexes)
  || foundationVectors.arrayIndexes.length === 0
  || !Array.isArray(foundationVectors.equalities)
  || foundationVectors.equalities.length === 0
  || !Array.isArray(foundationVectors.jsonValues)
  || foundationVectors.jsonValues.length === 0
) {
  fail("foundation vectors: array index, equality, and JSON boundary fixtures are required.");
}

const nonRuntimeRequirements = new Map();
const nonRuntimeCounts = { static: 0, deferred: 0 };
for (const entry of jsonDocumentVectors.nonRuntimeRequirements ?? []) {
  if (!requirementSet.has(entry.id)) {
    fail(`v3 vectors: unknown non-runtime requirement ${entry.id}.`);
  }
  if (runtimeRequirements.has(entry.id) || nonRuntimeRequirements.has(entry.id)) {
    fail(`v3 vectors: duplicate requirement coverage ${entry.id}.`);
  }
  if (!(entry.mode in nonRuntimeCounts)) {
    fail(`v3 vectors: invalid coverage mode ${entry.mode}.`);
  } else {
    nonRuntimeCounts[entry.mode] += 1;
  }
  if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
    fail(`v3 vectors: ${entry.id} needs a reason.`);
  }
  nonRuntimeRequirements.set(entry.id, entry.mode);
}
setEqual(
  "v3 requirement coverage",
  [...runtimeRequirements, ...nonRuntimeRequirements.keys()],
  manifest.requirements,
);
equal("v3 coverage", jsonDocumentVectors.coverage, {
  runtime: runtimeRequirements.size,
  static: nonRuntimeCounts.static,
  deferred: nonRuntimeCounts.deferred,
});
if (/"_zod"\s*:|"safeParse"\s*:/.test(JSON.stringify([
  jsonDocumentVectors,
  protocolVectors,
]))) {
  fail("v3 vectors: provider object leaked.");
}

assertGenericSuite(
  "json-document suite",
  jsonDocumentSuite,
  /JSONDocumentHarness[\s\S]*runJSONDocumentConformance/,
);
assertPublicBinding(
  "json-document binding",
  jsonDocumentBinding,
  /createJSONDocument[\s\S]*runJSONDocumentConformance/,
);
requirePattern(
  "json-document binding",
  jsonDocumentBinding,
  /runPressureConformance\(referenceHarness\)/,
);
requirePattern(
  "json-document binding",
  jsonDocumentBinding,
  /return createJSONDocument\(/,
);
assertGenericSuite(
  "protocol suite",
  protocolSuite,
  /ProtocolHarness[\s\S]*runProtocolConformance/,
);
assertPublicBinding(
  "protocol binding",
  protocolBinding,
  /applyPatch[\s\S]*runProtocolConformance/,
);
assertGenericSuite(
  "pressure suite",
  pressureSuite,
  /JSONDocumentHarness[\s\S]*runPressureConformance/,
);
if (
  /@interactive-os\/json-document|\/src\//.test(
    independentJSONDocumentImplementation,
  )
) {
  fail("independent JSON Document: reference package or private source import leaked.");
}
if (
  /@interactive-os\/json-document|\/src\//.test(independentJSONDocumentBinding)
) {
  fail("independent JSON Document binding must not import the reference implementation.");
}
for (const pattern of [
  /createIndependentJSONDocument/,
  /runJSONDocumentConformance\(independentHarness\)/,
  /runPressureConformance\(independentHarness\)/,
]) {
  requirePattern("independent JSON Document binding", independentJSONDocumentBinding, pattern);
}
for (const pattern of [
  /from "@interactive-os\/json-document-collaboration"/,
  /runJSONDocumentConformance\(harness\)/,
  /runPressureConformance\(harness\)/,
]) {
  requirePattern(
    "collaboration JSON Document binding",
    collaborationJSONDocumentBinding,
    pattern,
  );
}
assertGenericSuite(
  "pointer suite",
  pointerSuite,
  /PointerHarness[\s\S]*runPointerConformance/,
);
assertPublicBinding(
  "pointer binding",
  pointerBinding,
  /appendSegment[\s\S]*runPointerConformance/,
);
assertGenericSuite(
  "RFC 6902 suite",
  rfc6902Suite,
  /RFC6902Harness[\s\S]*runRFC6902Conformance/,
);
assertPublicBinding(
  "RFC 6902 binding",
  rfc6902Binding,
  /applyPatch[\s\S]*runRFC6902Conformance/,
);
assertGenericSuite(
  "RFC 9535 suite",
  jsonPathSuite,
  /JSONPathHarness[\s\S]*runJSONPathConformance/,
);
assertPublicBinding(
  "RFC 9535 binding",
  jsonPathBinding,
  /createJSONDocument[\s\S]*runJSONPathConformance/,
);

if (failures.length > 0) {
  console.error(
    `json-document v3 standardization failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    "json-document standardization ok: 1 entrypoint, 21 exports, 6 JSON Document members, 0 runtime peers",
  );
}
