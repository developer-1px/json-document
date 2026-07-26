import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const EXPECTED_VALUES = [
  "appendSegment",
  "applyPatch",
  "buildPointer",
  "createJSONDocument",
  "parentPointer",
  "parsePointer",
  "trackPointer",
  "tryParsePointer",
];
const EXPECTED_TYPES = [
  "JSONAppliedChange",
  "JSONCapabilityResult",
  "JSONChangeMetadata",
  "JSONDocument",
  "JSONDocumentCommitOptions",
  "JSONDocumentCommitResult",
  "JSONPatchOperation",
  "JSONPatchResult",
  "JSONValue",
  "Pointer",
  "QueryResult",
  "ReadResult",
];
const EXPECTED_MEMBERS = [
  "value",
  "at",
  "query",
  "canPatch",
  "commit",
  "subscribe",
];
const EXPECTED_CONFORMANCE = {
  projectionVectors: "packages/json-document/tests/conformance/v2/projection-vectors.json",
  projectionSuite: "packages/json-document/tests/conformance/v2/projection-suite.ts",
  projectionBinding: "packages/json-document/tests/public/v2-projection-standard-conformance.test.ts",
  protocolVectors: "packages/json-document/tests/conformance/v2/protocol-vectors.json",
  protocolSuite: "packages/json-document/tests/conformance/v2/protocol-suite.ts",
  protocolBinding: "packages/json-document/tests/public/v2-protocol-standard-conformance.test.ts",
  pointerVectors: "packages/json-document/tests/conformance/v2/pointer-vectors.json",
  pointerSuite: "packages/json-document/tests/conformance/v2/pointer-suite.ts",
  pointerBinding: "packages/json-document/tests/public/v2-pointer-standard-conformance.test.ts",
  rfc6902Suite: "packages/json-document/tests/conformance/v2/rfc6902-suite.ts",
  rfc6902Binding: "packages/json-document/tests/public/v2-rfc6902-standard-conformance.test.ts",
  jsonPathSuite: "packages/json-document/tests/conformance/v2/jsonpath-suite.ts",
  jsonPathBinding: "packages/json-document/tests/public/v2-jsonpath-standard-conformance.test.ts",
};

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

const manifest = json("docs/standard/v2-public-surface.json");
const profile = read("docs/standard/v2-projection-profile.md");
const packageContract = json("packages/json-document/public-contract.json");
const packageManifest = json("packages/json-document/package.json");
const buildConfig = json("packages/json-document/tsconfig.json");
const rootSource = read("packages/json-document/src/application/document/index.ts");
const contractSource = read("packages/json-document/src/application/document/contract.ts");
const signatureSource = read(
  "packages/json-document/tests/public/v2-signature-contract.test-d.ts",
);
const packageSmoke = read("packages/json-document/tests/smoke/package-smoke.mjs");
const coreBenchmark = read("scripts/benchmark-core.mjs");

if (manifest.formatVersion !== 1 || manifest.status !== "candidate") {
  fail("v2 manifest: expected formatVersion 1 and candidate status.");
}
if (manifest.sourceContract !== "packages/json-document/public-contract.json#root") {
  fail("v2 manifest: sourceContract must point to the root public contract.");
}
equal("v2 manifest projection members", manifest.projectionMembers, EXPECTED_MEMBERS);
equal("v2 manifest conformance paths", manifest.conformance, EXPECTED_CONFORMANCE);
equal("v2 manifest binding values", manifest.binding?.values, EXPECTED_VALUES);
equal("v2 manifest binding types", manifest.binding?.types, EXPECTED_TYPES);
equal("v2 manifest counts", manifest.counts, {
  values: 8,
  types: 12,
  exports: 20,
  projectionMembers: 6,
});
equal("v2 package identity", {
  name: manifest.package?.name,
  version: manifest.package?.version,
  entrypoint: manifest.package?.entrypoint,
}, {
  name: packageManifest.name,
  version: packageManifest.version,
  entrypoint: ".",
});
equal(
  "v2 excluded entrypoints",
  manifest.package?.excludedEntrypoints,
  ["./session", "./react"],
);
equal("v2 runtime dependencies", manifest.package?.runtimeDependencies, []);
equal("v2 peer dependencies", manifest.package?.peerDependencies, []);

equal("public contract entrypoints", Object.keys(packageContract), ["root"]);
equal("public contract values", packageContract.root?.values, EXPECTED_VALUES);
equal("public contract types", packageContract.root?.types, EXPECTED_TYPES);

const sourceExports = publicExports(rootSource);
equal("root source values", sourceExports.values, [...EXPECTED_VALUES].sort());
equal("root source types", sourceExports.types, [...EXPECTED_TYPES].sort());
equal(
  "JSONDocument members",
  interfaceMembers(contractSource, "JSONDocument"),
  EXPECTED_MEMBERS,
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
    fail(`package: ${field} must be absent from the v2 kernel.`);
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
  ...profile.matchAll(/\bJD2-[A-Z]+-\d{3}\b/g),
].map((match) => match[0]);
if (documentedRequirements.length !== new Set(documentedRequirements).size) {
  fail("v2 profile: every requirement ID must appear exactly once.");
}
setEqual(
  "v2 requirements",
  documentedRequirements,
  manifest.requirements ?? [],
);
for (const word of ["MUST", "SHOULD", "MAY"]) {
  requirePattern("v2 profile normative language", profile, new RegExp(`\\b${word}\\b`));
}
for (const pattern of [
  /Pure Protocol -> Projection -> host adapter/,
  /root entrypoint 하나와 20개 Kernel symbol/,
  /runtime dependency와 peer dependency가 없다/,
  /archived 1\.x implementation은 production build와 tarball에\s*포함하지 않는다/,
]) {
  requirePattern("v2 profile package closure", profile, pattern);
}

requirePattern(
  "v2 signature exact document",
  signatureSource,
  /"value" \| "at" \| "query" \| "canPatch" \| "commit" \| "subscribe"/,
);
requirePattern(
  "v2 signature JSON boundary",
  signatureSource,
  /document\.value satisfies JSONValue/,
);
if (
  /@interactive-os\/json-document\/(?:session|react)|JSONDocument<Row>|document\.value\.id/.test(
    signatureSource,
  )
) {
  fail("v2 signature: archived entrypoint or unsound document generic leaked.");
}

for (const path of Object.values(EXPECTED_CONFORMANCE)) {
  if (!existsSync(join(repoRoot, path))) fail(`v2 conformance artifact missing: ${path}.`);
}

const projectionVectors = json(manifest.conformance.projectionVectors);
const protocolVectors = json(manifest.conformance.protocolVectors);
const pointerVectors = json(manifest.conformance.pointerVectors);
const projectionSuite = read(manifest.conformance.projectionSuite);
const projectionBinding = read(manifest.conformance.projectionBinding);
const protocolSuite = read(manifest.conformance.protocolSuite);
const protocolBinding = read(manifest.conformance.protocolBinding);
const pointerSuite = read(manifest.conformance.pointerSuite);
const pointerBinding = read(manifest.conformance.pointerBinding);
const rfc6902Suite = read(manifest.conformance.rfc6902Suite);
const rfc6902Binding = read(manifest.conformance.rfc6902Binding);
const jsonPathSuite = read(manifest.conformance.jsonPathSuite);
const jsonPathBinding = read(manifest.conformance.jsonPathBinding);

for (const [label, vectors] of [
  ["projection", projectionVectors],
  ["protocol", protocolVectors],
  ["pointer", pointerVectors],
]) {
  if (
    vectors.formatVersion !== 1
    || vectors.status !== "candidate"
    || vectors.profile !== "docs/standard/v2-projection-profile.md"
  ) {
    fail(`${label} vectors: metadata drifted.`);
  }
}
equal("projection vector members", projectionVectors.projectionMembers, EXPECTED_MEMBERS);
if (protocolVectors.function !== "applyPatch") {
  fail("protocol vectors: function must be applyPatch.");
}
equal(
  "pointer vector requirements",
  pointerVectors.requirements,
  ["JD2-ADDRESS-001", "JD2-PATCH-001"],
);
for (const group of ["parse", "invalid", "build", "append", "parent", "track"]) {
  if (!Array.isArray(pointerVectors[group]) || pointerVectors[group].length === 0) {
    fail(`pointer vectors: ${group} must be non-empty.`);
  }
}

const requirementSet = new Set(manifest.requirements ?? []);
const runtimeRequirements = new Set();
const allowedVectorKinds = {
  projection: new Set([
    "surface",
    "read",
    "commit",
    "unsubscribe",
    "unsubscribe-during-publication",
    "isolation",
    "non-json",
    "reentrant-publication",
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
  ["projection", projectionVectors.vectors ?? []],
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

const nonRuntimeRequirements = new Map();
const nonRuntimeCounts = { static: 0, deferred: 0 };
for (const entry of projectionVectors.nonRuntimeRequirements ?? []) {
  if (!requirementSet.has(entry.id)) {
    fail(`v2 vectors: unknown non-runtime requirement ${entry.id}.`);
  }
  if (runtimeRequirements.has(entry.id) || nonRuntimeRequirements.has(entry.id)) {
    fail(`v2 vectors: duplicate requirement coverage ${entry.id}.`);
  }
  if (!(entry.mode in nonRuntimeCounts)) {
    fail(`v2 vectors: invalid coverage mode ${entry.mode}.`);
  } else {
    nonRuntimeCounts[entry.mode] += 1;
  }
  if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
    fail(`v2 vectors: ${entry.id} needs a reason.`);
  }
  nonRuntimeRequirements.set(entry.id, entry.mode);
}
setEqual(
  "v2 requirement coverage",
  [...runtimeRequirements, ...nonRuntimeRequirements.keys()],
  manifest.requirements,
);
equal("v2 coverage", projectionVectors.coverage, {
  runtime: runtimeRequirements.size,
  static: nonRuntimeCounts.static,
  deferred: nonRuntimeCounts.deferred,
});
if (/"_zod"\s*:|"safeParse"\s*:/.test(JSON.stringify([
  projectionVectors,
  protocolVectors,
]))) {
  fail("v2 vectors: provider object leaked.");
}

assertGenericSuite(
  "projection suite",
  projectionSuite,
  /ProjectionHarness[\s\S]*runProjectionConformance/,
);
for (const pattern of [
  /readonly value[\s\S]*at\([\s\S]*query\([\s\S]*canPatch\([\s\S]*commit\([\s\S]*subscribe\(/,
  /toMatchObject/,
]) {
  requirePattern("projection suite", projectionSuite, pattern);
}
if (/Object\.keys\([^)]*(?:result|change)/.test(projectionSuite)) {
  fail("projection suite: exact result or change keys must not be asserted.");
}
assertPublicBinding(
  "projection binding",
  projectionBinding,
  /createJSONDocument[\s\S]*runProjectionConformance/,
);
requirePattern(
  "projection binding",
  projectionBinding,
  /return createJSONDocument\(/,
);
if (/\.(?:lastPatch|patch|find|canFind|canQuery)\b/.test(projectionBinding)) {
  fail("projection binding: archived compatibility member leaked.");
}
assertGenericSuite(
  "protocol suite",
  protocolSuite,
  /ProtocolHarness[\s\S]*runProtocolConformance/,
);
for (const pattern of [/toMatchObject/, /hasOwnProperty/]) {
  requirePattern("protocol suite", protocolSuite, pattern);
}
assertPublicBinding(
  "protocol binding",
  protocolBinding,
  /applyPatch[\s\S]*runProtocolConformance/,
);
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
for (const symbol of [
  "appendSegment",
  "buildPointer",
  "parentPointer",
  "parsePointer",
  "trackPointer",
  "tryParsePointer",
]) {
  requirePattern("pointer binding", pointerBinding, new RegExp(`\\b${symbol}\\b`));
}
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

for (const pattern of [
  /Object\.keys\(packageJson\.exports\)\.join\(","\) !== "\."/,
  /packageJson\.peerDependencies !== undefined/,
  /application\/session/,
  /application\/react-document/,
  /Archived implementation leaked into dist/,
]) {
  requirePattern("package smoke v2 closure", packageSmoke, pattern);
}
for (const pattern of [
  /dist\/application\/document\/index\.js/,
  /createJSONDocument/,
  /applyPatch/,
  /commit single leaf replace/,
]) {
  requirePattern("v2 core benchmark", coreBenchmark, pattern);
}
if (/application\/session|from\s+["']zod["']/.test(coreBenchmark)) {
  fail("v2 core benchmark: archived session or schema provider leaked.");
}

if (failures.length > 0) {
  console.error(
    `json-document v2 standardization failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    "json-document v2 standardization ok: 1 entrypoint, 20 exports, 6 document members, 0 runtime peers",
  );
}
