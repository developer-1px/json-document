import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function requirePattern(name, source, pattern) {
  if (!pattern.test(source)) fail(`${name}: missing ${pattern}.`);
}

const V2_DISPOSITIONS = ["kernel", "session", "compat", "remove"];
const V2_PROJECTION_MEMBERS = [
  "value",
  "at",
  "query",
  "canPatch",
  "commit",
  "subscribe",
];

function publicSymbolKey(entrypoint, kind, name) {
  return `${entrypoint}:${kind}:${name}`;
}

function compareSets(label, expected, actual) {
  for (const value of expected) {
    if (!actual.has(value)) fail(`${label}: missing ${value}.`);
  }
  for (const value of actual) {
    if (!expected.has(value)) fail(`${label}: unexpected ${value}.`);
  }
}

function extractExpectedDocumentMembers(source) {
  const header = "interface ExpectedJSONDocument<T> {";
  const headerIndex = source.indexOf(header);
  if (headerIndex === -1) {
    fail("v2 public surface: ExpectedJSONDocument<T> was not found.");
    return new Set();
  }

  const bodyStart = headerIndex + header.length;
  let bodyEnd = -1;
  let interfaceDepth = 1;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") interfaceDepth += 1;
    if (source[index] === "}") interfaceDepth -= 1;
    if (interfaceDepth === 0) {
      bodyEnd = index;
      break;
    }
  }
  if (bodyEnd === -1) {
    fail("v2 public surface: ExpectedJSONDocument<T> is not closed.");
    return new Set();
  }

  const members = new Set();
  let parentheses = 0;
  let braces = 0;
  let brackets = 0;
  for (const line of source.slice(bodyStart, bodyEnd).split("\n")) {
    if (parentheses === 0 && braces === 0 && brackets === 0) {
      const member = /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*(?=[:(])/.exec(line)?.[1];
      if (member !== undefined) members.add(member);
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

function validateV2Conformance(
  draft,
  projectionVectors,
  projectionSuiteSource,
  projectionReferenceSource,
  protocolVectors,
  protocolSuiteSource,
  protocolReferenceSource,
  pointerVectors,
  pointerSuiteSource,
  pointerReferenceSource,
  rfc6902SuiteSource,
  rfc6902ReferenceSource,
  jsonPathSuiteSource,
  jsonPathReferenceSource,
  requirementSet,
) {
  const expectedArtifacts = {
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
  if (JSON.stringify(draft.conformance) !== JSON.stringify(expectedArtifacts)) {
    fail("v2 conformance: artifact paths changed without updating the evaluator.");
  }
  if (projectionVectors.formatVersion !== 1 || projectionVectors.status !== "candidate") {
    fail("v2 Projection vectors: expected formatVersion 1 and candidate status.");
  }
  if (projectionVectors.profile !== "docs/standard/v2-projection-profile.md") {
    fail("v2 Projection vectors: unexpected profile.");
  }
  if (
    JSON.stringify(projectionVectors.projectionMembers)
    !== JSON.stringify(V2_PROJECTION_MEMBERS)
  ) {
    fail("v2 Projection vectors: Projection members drifted.");
  }
  if (
    protocolVectors.formatVersion !== 1
    || protocolVectors.status !== "candidate"
    || protocolVectors.profile !== "docs/standard/v2-projection-profile.md"
    || protocolVectors.function !== "applyPatch"
  ) {
    fail("v2 Protocol vectors: metadata drifted.");
  }

  const runtimeRequirements = new Set();
  const vectorIds = new Set();
  const allowedKinds = new Set([
    "surface",
    "read",
    "commit",
    "unsubscribe",
    "unsubscribe-during-publication",
    "isolation",
    "non-json",
    "reentrant-publication",
    "subscriber-error",
  ]);
  if (!Array.isArray(projectionVectors.vectors)) {
    fail("v2 conformance vectors: vectors must be an array.");
  }
  for (const vector of projectionVectors.vectors ?? []) {
    if (typeof vector.id !== "string" || vector.id.trim() === "") {
      fail("v2 conformance vectors: every vector needs an id.");
    } else if (vectorIds.has(vector.id)) {
      fail(`v2 conformance vectors: duplicate vector id ${vector.id}.`);
    } else {
      vectorIds.add(vector.id);
    }
    if (!allowedKinds.has(vector.kind)) {
      fail(`v2 conformance vectors: ${vector.id} has unknown kind ${vector.kind}.`);
    }
    if (!Array.isArray(vector.requirements) || vector.requirements.length === 0) {
      fail(`v2 conformance vectors: ${vector.id} needs requirement traceability.`);
      continue;
    }
    for (const requirementId of vector.requirements) {
      if (!requirementSet.has(requirementId)) {
        fail(`v2 conformance vectors: ${vector.id} references unknown ${requirementId}.`);
      }
      runtimeRequirements.add(requirementId);
    }
  }

  const protocolKinds = new Set([
    "patch",
    "extra-fields",
    "non-json-state",
    "non-json-payload",
    "precedence",
    "isolation",
  ]);
  const protocolVectorIds = new Set();
  for (const vector of protocolVectors.vectors ?? []) {
    if (typeof vector.id !== "string" || vector.id.trim() === "") {
      fail("v2 Protocol vectors: every vector needs an id.");
    } else if (protocolVectorIds.has(vector.id)) {
      fail(`v2 Protocol vectors: duplicate vector id ${vector.id}.`);
    } else {
      protocolVectorIds.add(vector.id);
    }
    if (!protocolKinds.has(vector.kind)) {
      fail(`v2 Protocol vectors: ${vector.id} has unknown kind ${vector.kind}.`);
    }
    if (!Array.isArray(vector.requirements) || vector.requirements.length === 0) {
      fail(`v2 Protocol vectors: ${vector.id} needs requirement traceability.`);
      continue;
    }
    for (const requirementId of vector.requirements) {
      if (!requirementSet.has(requirementId)) {
        fail(`v2 Protocol vectors: ${vector.id} references unknown ${requirementId}.`);
      }
      runtimeRequirements.add(requirementId);
    }
  }

  const nonRuntimeRequirements = new Map();
  const coverageByMode = { static: 0, deferred: 0 };
  for (const entry of projectionVectors.nonRuntimeRequirements ?? []) {
    if (!requirementSet.has(entry.id)) {
      fail(`v2 conformance vectors: unknown non-runtime requirement ${entry.id}.`);
    }
    if (runtimeRequirements.has(entry.id)) {
      fail(`v2 conformance vectors: ${entry.id} is both runtime and non-runtime.`);
    }
    if (nonRuntimeRequirements.has(entry.id)) {
      fail(`v2 conformance vectors: duplicate non-runtime requirement ${entry.id}.`);
    }
    if (!["static", "deferred"].includes(entry.mode)) {
      fail(`v2 conformance vectors: ${entry.id} has invalid mode ${entry.mode}.`);
    } else {
      coverageByMode[entry.mode] += 1;
    }
    if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
      fail(`v2 conformance vectors: ${entry.id} needs a reason.`);
    }
    nonRuntimeRequirements.set(entry.id, entry.mode);
  }
  compareSets(
    "v2 conformance requirement coverage",
    requirementSet,
    new Set([...runtimeRequirements, ...nonRuntimeRequirements.keys()]),
  );
  compareSets(
    "v2 conformance coverage modes",
    new Set(["runtime", "static", "deferred"]),
    new Set(Object.keys(projectionVectors.coverage ?? {})),
  );
  if (projectionVectors.coverage?.runtime !== runtimeRequirements.size) {
    fail("v2 conformance vectors: runtime coverage count drifted.");
  }
  if (projectionVectors.coverage?.static !== coverageByMode.static) {
    fail("v2 conformance vectors: static coverage count drifted.");
  }
  if (projectionVectors.coverage?.deferred !== coverageByMode.deferred) {
    fail("v2 conformance vectors: deferred coverage count drifted.");
  }
  if (
    /"_zod"\s*:|"safeParse"\s*:/.test(
      JSON.stringify([projectionVectors, protocolVectors]),
    )
  ) {
    fail("v2 conformance vectors: provider object leaked into machine-readable data.");
  }

  if (
    /@interactive-os\/json-document|from\s+["']zod["']|\/src\//.test(
      projectionSuiteSource,
    )
  ) {
    fail("v2 conformance suite: generic runner must be implementation and provider independent.");
  }
  for (const [label, pattern] of [
    ["injected harness", /ProjectionHarness[\s\S]*runProjectionConformance/],
    ["six-member contract", /readonly value[\s\S]*at\([\s\S]*query\([\s\S]*canPatch\([\s\S]*commit\([\s\S]*subscribe\(/],
    ["required-field matching", /toMatchObject/],
  ]) {
    requirePattern(`v2 Projection suite ${label}`, projectionSuiteSource, pattern);
  }
  if (/Object\.keys\([^)]*(?:result|change)/.test(projectionSuiteSource)) {
    fail("v2 conformance suite: exact result or change keys must not be asserted.");
  }

  if (!/from "@interactive-os\/json-document"/.test(projectionReferenceSource)) {
    fail("v2 reference binding: must import from the public root package.");
  }
  if (
    /from ["'][^"']*(?:\/src\/|domain\/|foundation\/)|\/src\//.test(
      projectionReferenceSource,
    )
  ) {
    fail("v2 reference binding: must not import implementation-private modules.");
  }
  for (const [label, pattern] of [
    ["public factory", /createJSONDocument/],
    ["injected suite", /runProjectionConformance/],
    ["direct structural binding", /return createJSONDocument\(/],
  ]) {
    requirePattern(`v2 Projection binding ${label}`, projectionReferenceSource, pattern);
  }
  if (/\.(?:lastPatch|patch|find|canFind|canQuery)\b/.test(projectionReferenceSource)) {
    fail("v2 reference binding: compatibility members leaked into the Projection adapter.");
  }

  if (
    /@interactive-os\/json-document|from\s+["']zod["']|\/src\//.test(
      protocolSuiteSource,
    )
  ) {
    fail("v2 Protocol suite: generic runner must be implementation independent.");
  }
  for (const [label, pattern] of [
    ["injected harness", /ProtocolHarness[\s\S]*runProtocolConformance/],
    ["required-field matching", /toMatchObject/],
    ["partial canonical-field check", /hasOwnProperty/],
  ]) {
    requirePattern(`v2 Protocol suite ${label}`, protocolSuiteSource, pattern);
  }
  if (
    !/from "@interactive-os\/json-document"/.test(protocolReferenceSource)
    || /\/src\/|domain\/|foundation\//.test(protocolReferenceSource)
  ) {
    fail("v2 Protocol binding must import only the public root package.");
  }
  requirePattern(
    "v2 Protocol binding",
    protocolReferenceSource,
    /applyPatch[\s\S]*runProtocolConformance/,
  );

  if (
    pointerVectors.formatVersion !== 1
    || pointerVectors.status !== "candidate"
    || pointerVectors.profile !== "docs/standard/v2-projection-profile.md"
    || JSON.stringify(pointerVectors.requirements)
      !== JSON.stringify(["JD2-ADDRESS-001", "JD2-PATCH-001"])
  ) {
    fail("v2 Pointer vectors: metadata drifted.");
  }
  for (const group of ["parse", "invalid", "build", "append", "parent", "track"]) {
    if (!Array.isArray(pointerVectors[group]) || pointerVectors[group].length === 0) {
      fail(`v2 Pointer vectors: ${group} must be a non-empty array.`);
    }
  }
  if (
    /@interactive-os\/json-document|\/src\//.test(pointerSuiteSource)
    || !/PointerHarness[\s\S]*runPointerConformance/.test(pointerSuiteSource)
  ) {
    fail("v2 Pointer suite must be an implementation-independent injected harness.");
  }
  if (
    !/from "@interactive-os\/json-document"/.test(pointerReferenceSource)
    || /\/src\/|domain\/|foundation\//.test(pointerReferenceSource)
  ) {
    fail("v2 Pointer binding must import only the public root package.");
  }
  for (const symbol of [
    "appendSegment",
    "buildPointer",
    "parentPointer",
    "parsePointer",
    "trackPointer",
    "tryParsePointer",
  ]) {
    requirePattern(
      `v2 Pointer binding ${symbol}`,
      pointerReferenceSource,
      new RegExp(`\\b${symbol}\\b`),
    );
  }

  if (
    /@interactive-os\/json-document|\/src\//.test(rfc6902SuiteSource)
    || !/RFC6902Harness[\s\S]*runRFC6902Conformance/.test(rfc6902SuiteSource)
  ) {
    fail("v2 RFC 6902 suite must be an implementation-independent injected harness.");
  }
  if (
    !/from "@interactive-os\/json-document"/.test(rfc6902ReferenceSource)
    || /\/src\/|domain\/|foundation\//.test(rfc6902ReferenceSource)
  ) {
    fail("v2 RFC 6902 binding must import only the public root package.");
  }
  requirePattern(
    "v2 RFC 6902 binding",
    rfc6902ReferenceSource,
    /applyPatch[\s\S]*runRFC6902Conformance/,
  );

  if (
    /@interactive-os\/json-document|\/src\//.test(jsonPathSuiteSource)
    || !/JSONPathHarness[\s\S]*runJSONPathConformance/.test(jsonPathSuiteSource)
  ) {
    fail("v2 RFC 9535 suite must be an implementation-independent injected harness.");
  }
  if (
    !/from "@interactive-os\/json-document"/.test(jsonPathReferenceSource)
    || /\/src\/|domain\/|foundation\//.test(jsonPathReferenceSource)
  ) {
    fail("v2 RFC 9535 binding must import only the public root package.");
  }
  requirePattern(
    "v2 RFC 9535 binding",
    jsonPathReferenceSource,
    /createJSONDocument[\s\S]*runJSONPathConformance/,
  );
}

function validateV2PublicSurface(
  draft,
  profile,
  contract,
  baselineSignatureSource,
  v2SignatureSource,
  projectionVectors,
  projectionSuiteSource,
  projectionReferenceSource,
  protocolVectors,
  protocolSuiteSource,
  protocolReferenceSource,
  pointerVectors,
  pointerSuiteSource,
  pointerReferenceSource,
  rfc6902SuiteSource,
  rfc6902ReferenceSource,
  jsonPathSuiteSource,
  jsonPathReferenceSource,
  packageVersion,
) {
  if (draft.formatVersion !== 1) {
    fail("v2 public surface: formatVersion must be 1.");
  }
  if (draft.status !== "candidate") {
    fail("v2 public surface: status must be candidate before the stability gate passes.");
  }
  if (draft.sourceContract !== "packages/json-document/public-contract.json#root") {
    fail("v2 public surface: sourceContract must point to the v2 root contract.");
  }
  if (
    draft.migrationBaselineContract
    !== "packages/json-document/public-contract.json#session"
  ) {
    fail(
      "v2 public surface: migrationBaselineContract must point to the 1.x Session baseline.",
    );
  }

  const requirementIds = Array.isArray(draft.requirements) ? draft.requirements : [];
  const requirementSet = new Set(requirementIds);
  if (requirementIds.length !== requirementSet.size) {
    fail("v2 public surface: requirement IDs must be unique.");
  }
  for (const requirementId of requirementIds) {
    if (!/^JD2-[A-Z]+-\d{3}$/.test(requirementId)) {
      fail(`v2 public surface: invalid requirement ID ${requirementId}.`);
    }
  }
  const documentedRequirementIds = [
    ...profile.matchAll(/\bJD2-[A-Z]+-\d{3}\b/g),
  ].map((match) => match[0]);
  const documentedRequirementSet = new Set(documentedRequirementIds);
  if (documentedRequirementIds.length !== documentedRequirementSet.size) {
    fail("v2 projection profile: each requirement ID must appear exactly once.");
  }
  compareSets("v2 projection requirements", requirementSet, documentedRequirementSet);

  if (
    JSON.stringify(draft.projectionMembers)
    !== JSON.stringify(V2_PROJECTION_MEMBERS)
  ) {
    fail(
      `v2 public surface: projectionMembers must be exactly ${V2_PROJECTION_MEMBERS.join(", ")}.`,
    );
  }

  const baselineContract = {
    root: contract.session,
    react: contract.react,
  };
  const actualSymbols = new Set();
  for (const [entrypoint, entry] of Object.entries(baselineContract)) {
    for (const kind of ["values", "types"]) {
      for (const name of entry[kind] ?? []) {
        const key = publicSymbolKey(entrypoint, kind, name);
        if (actualSymbols.has(key)) fail(`public contract: duplicate ${key}.`);
        actualSymbols.add(key);
      }
    }
  }
  if (draft.counts?.baselinePackageSymbols !== actualSymbols.size) {
    fail(
      `v2 public surface: expected ${draft.counts?.baselinePackageSymbols} baseline package symbols, found ${actualSymbols.size}.`,
    );
  }

  const classifiedSymbols = new Map();
  const contractEntrypoints = new Set(Object.keys(baselineContract));
  compareSets(
    "v2 public surface dispositions",
    new Set(V2_DISPOSITIONS),
    new Set(Object.keys(draft.dispositions ?? {})),
  );
  for (const disposition of V2_DISPOSITIONS) {
    const dispositionEntries = draft.dispositions?.[disposition];
    if (dispositionEntries === undefined) {
      fail(`v2 public surface: missing ${disposition} disposition.`);
      continue;
    }
    compareSets(
      `v2 public surface ${disposition} entrypoints`,
      contractEntrypoints,
      new Set(Object.keys(dispositionEntries)),
    );

    let dispositionCount = 0;
    for (const entrypoint of contractEntrypoints) {
      const entry = dispositionEntries[entrypoint];
      if (entry === undefined) continue;
      compareSets(
        `v2 public surface ${disposition}/${entrypoint} kinds`,
        new Set(["values", "types"]),
        new Set(Object.keys(entry)),
      );
      for (const kind of ["values", "types"]) {
        const names = entry[kind];
        if (!Array.isArray(names)) {
          fail(`v2 public surface: ${disposition}/${entrypoint}/${kind} must be an array.`);
          continue;
        }
        for (const name of names) {
          const key = publicSymbolKey(entrypoint, kind, name);
          if (classifiedSymbols.has(key)) {
            fail(`v2 public surface: ${key} is classified more than once.`);
          }
          classifiedSymbols.set(key, disposition);
          dispositionCount += 1;
        }
      }
    }
    if (draft.counts?.dispositions?.[disposition] !== dispositionCount) {
      fail(
        `v2 public surface: ${disposition} count is ${dispositionCount}, not ${draft.counts?.dispositions?.[disposition]}.`,
      );
    }
  }
  compareSets(
    "v2 public surface package symbols",
    actualSymbols,
    new Set(classifiedSymbols.keys()),
  );

  const actualDocumentMembers = extractExpectedDocumentMembers(
    baselineSignatureSource,
  );
  if (draft.counts?.baselineDocumentMembers !== actualDocumentMembers.size) {
    fail(
      `v2 public surface: expected ${draft.counts?.baselineDocumentMembers} baseline document members, found ${actualDocumentMembers.size}.`,
    );
  }
  const classifiedDocumentMembers = new Map();
  compareSets(
    "v2 public surface document dispositions",
    new Set(V2_DISPOSITIONS),
    new Set(Object.keys(draft.documentMembers ?? {})),
  );
  for (const disposition of V2_DISPOSITIONS) {
    const members = draft.documentMembers?.[disposition];
    if (!Array.isArray(members)) {
      fail(`v2 public surface: document ${disposition} members must be an array.`);
      continue;
    }
    for (const member of members) {
      if (classifiedDocumentMembers.has(member)) {
        fail(`v2 public surface: document member ${member} is classified more than once.`);
      }
      classifiedDocumentMembers.set(member, disposition);
    }
    if (draft.counts?.documentDispositions?.[disposition] !== members.length) {
      fail(
        `v2 public surface: document ${disposition} count is ${members.length}, not ${draft.counts?.documentDispositions?.[disposition]}.`,
      );
    }
  }
  compareSets(
    "v2 public surface document members",
    actualDocumentMembers,
    new Set(classifiedDocumentMembers.keys()),
  );
  if (
    JSON.stringify(draft.documentMembers?.kernel)
    !== JSON.stringify(V2_PROJECTION_MEMBERS)
  ) {
    fail("v2 public surface: document kernel must be the ordered six-member Projection.");
  }

  const packageCompat = new Set(
    [...classifiedSymbols.entries()]
      .filter(([, disposition]) => disposition === "compat")
      .map(([key]) => key),
  );
  const compatReplacements = draft.compatReplacements ?? {};
  compareSets(
    "v2 public surface package compat replacements",
    packageCompat,
    new Set(Object.keys(compatReplacements)),
  );
  for (const [key, rule] of Object.entries(compatReplacements)) {
    if (
      typeof rule?.replacement !== "string"
      || rule.replacement.trim() === ""
      || typeof rule?.reason !== "string"
      || rule.reason.trim() === ""
    ) {
      fail(`v2 public surface: ${key} needs a non-empty replacement and reason.`);
    }
  }

  const documentCompat = new Set(
    [...classifiedDocumentMembers.entries()]
      .filter(([, disposition]) => disposition === "compat")
      .map(([name]) => name),
  );
  const documentCompatReplacements = draft.documentCompatReplacements ?? {};
  compareSets(
    "v2 public surface document compat replacements",
    documentCompat,
    new Set(Object.keys(documentCompatReplacements)),
  );
  for (const [name, replacement] of Object.entries(documentCompatReplacements)) {
    if (typeof replacement !== "string" || replacement.trim() === "") {
      fail(`v2 public surface: document ${name} needs a non-empty replacement.`);
    }
  }

  const introducedSymbols = new Set();
  for (const symbol of draft.introducedSymbols ?? []) {
    const key = publicSymbolKey(symbol.entrypoint, symbol.kind, symbol.name);
    if (!contractEntrypoints.has(symbol.entrypoint)) {
      fail(`v2 public surface: introduced symbol has unknown entrypoint ${key}.`);
    }
    if (!["values", "types"].includes(symbol.kind)) {
      fail(`v2 public surface: introduced symbol has invalid kind ${key}.`);
    }
    if (!["kernel", "session"].includes(symbol.disposition)) {
      fail(`v2 public surface: introduced symbol has invalid disposition ${key}.`);
    }
    if (introducedSymbols.has(key)) {
      fail(`v2 public surface: introduced symbol appears more than once ${key}.`);
    }
    introducedSymbols.add(key);
    if (typeof symbol.implemented !== "boolean") {
      fail(`v2 public surface: introduced symbol needs implemented boolean ${key}.`);
    }
    const rootBindingHasSymbol = (contract.root?.[symbol.kind] ?? [])
      .includes(symbol.name);
    if (symbol.implemented !== rootBindingHasSymbol) {
      fail(`v2 public surface: implemented state drifted for ${key}.`);
    }
    for (const replaced of symbol.replaces ?? []) {
      const isCurrentSymbol = actualSymbols.has(replaced);
      const isDocumentMember = replaced.startsWith("document:")
        && actualDocumentMembers.has(replaced.slice("document:".length));
      if (!isCurrentSymbol && !isDocumentMember) {
        fail(`v2 public surface: introduced symbol ${key} replaces unknown ${replaced}.`);
      }
    }
  }

  for (const [source, rule] of Object.entries(compatReplacements)) {
    const targets = [
      ...rule.replacement.matchAll(
        /\b(root|react|proposed|introduced):(values|types):([A-Za-z_$][\w$]*)\b/g,
      ),
    ];
    for (const [, entrypoint, kind, name] of targets) {
      const target = ["proposed", "introduced"].includes(entrypoint)
        ? publicSymbolKey("root", kind, name)
        : publicSymbolKey(entrypoint, kind, name);
      const exists = ["proposed", "introduced"].includes(entrypoint)
        ? introducedSymbols.has(target)
        : actualSymbols.has(target);
      if (!exists) {
        fail(`v2 public surface: ${source} references unknown replacement ${target}.`);
      }
      if (
        !["proposed", "introduced"].includes(entrypoint)
        && !["kernel", "session"].includes(classifiedSymbols.get(target))
      ) {
        fail(`v2 public surface: ${source} points to non-canonical replacement ${target}.`);
      }
    }
  }

  const dispositionLabels = {
    kernel: "Kernel",
    session: "Session",
    compat: "Compat",
    remove: "Remove",
  };
  for (const disposition of V2_DISPOSITIONS) {
    const count = draft.counts?.dispositions?.[disposition];
    requirePattern(
      "v2 projection profile disposition summary",
      profile,
      new RegExp(`\\| ${dispositionLabels[disposition]} \\| ${count} \\|`),
    );
  }

  if (
    draft.binding?.version !== packageVersion
    || draft.binding?.contract !== "packages/json-document/public-contract.json#root"
    || draft.binding?.entrypoint !== "."
    || draft.binding?.sessionEntrypoint !== "./session"
  ) {
    fail("v2 public surface: package binding metadata drifted.");
  }
  compareSets(
    "v2 root value binding",
    new Set(draft.binding?.values ?? []),
    new Set(contract.root?.values ?? []),
  );
  compareSets(
    "v2 root type binding",
    new Set(draft.binding?.types ?? []),
    new Set(contract.root?.types ?? []),
  );
  requirePattern(
    "v2 signature exact six-member surface",
    v2SignatureSource,
    /ProjectionMembers[\s\S]*"value" \| "at" \| "query" \| "canPatch" \| "commit" \| "subscribe"/,
  );
  requirePattern(
    "v2 signature untyped JSON boundary",
    v2SignatureSource,
    /document\.value satisfies JSONValue/,
  );
  if (/JSONDocument<Row>|document\.value\.id/.test(v2SignatureSource)) {
    fail("v2 signature: unsound shape-preserving document generic returned.");
  }

  validateV2Conformance(
    draft,
    projectionVectors,
    projectionSuiteSource,
    projectionReferenceSource,
    protocolVectors,
    protocolSuiteSource,
    protocolReferenceSource,
    pointerVectors,
    pointerSuiteSource,
    pointerReferenceSource,
    rfc6902SuiteSource,
    rfc6902ReferenceSource,
    jsonPathSuiteSource,
    jsonPathReferenceSource,
    requirementSet,
  );
}

const standard = read("docs/standard/core-standard.md");
const conformanceProfile = read("docs/standard/conformance-profile.md");
const foundationGate = read("docs/standard/foundation-gate.md");
const resultContract = read("docs/standard/result-contract.md");
const selectionContract = read("docs/standard/selection-contract.md");
const schemaIntrospectionContract = read("docs/standard/schema-introspection-contract.md");
const v2ProjectionProfile = read("docs/standard/v2-projection-profile.md");
const v2PublicSurface = JSON.parse(read("docs/standard/v2-public-surface.json"));
const v2ProjectionVectors = JSON.parse(
  read(v2PublicSurface.conformance.projectionVectors),
);
const v2ProjectionSuite = read(v2PublicSurface.conformance.projectionSuite);
const v2ProjectionReference = read(v2PublicSurface.conformance.projectionBinding);
const v2ProtocolVectors = JSON.parse(
  read(v2PublicSurface.conformance.protocolVectors),
);
const v2ProtocolSuite = read(v2PublicSurface.conformance.protocolSuite);
const v2ProtocolReference = read(v2PublicSurface.conformance.protocolBinding);
const v2PointerVectors = JSON.parse(
  read(v2PublicSurface.conformance.pointerVectors),
);
const v2PointerSuite = read(v2PublicSurface.conformance.pointerSuite);
const v2PointerReference = read(v2PublicSurface.conformance.pointerBinding);
const v2RFC6902Suite = read(v2PublicSurface.conformance.rfc6902Suite);
const v2RFC6902Reference = read(v2PublicSurface.conformance.rfc6902Binding);
const v2JSONPathSuite = read(v2PublicSurface.conformance.jsonPathSuite);
const v2JSONPathReference = read(v2PublicSurface.conformance.jsonPathBinding);
const v2SignatureContract = read(
  "packages/json-document/tests/public/v2-signature-contract.test-d.ts",
);
const conformance = read("packages/json-document/tests/public/standard-conformance.test.ts");
const semanticContract = read("packages/json-document/tests/public/semantic-contract.test.ts");
const signatureContract = read("packages/json-document/tests/public/signature-contract.test-d.ts");
const publicContract = JSON.parse(read("packages/json-document/public-contract.json"));
const rootPackage = JSON.parse(read("package.json"));
const libraryPackage = JSON.parse(read("packages/json-document/package.json"));

for (const [label, pattern] of [
  ["normative language", /\bMUST\b[\s\S]*\bSHOULD\b[\s\S]*\bMAY\b/],
  ["conformance classes", /## 3\. 적합성 등급/],
  ["data model", /## 4\. 데이터 모델/],
  ["pointer-query-mutation distinction", /JSONPath는 mutation target으로 받아들이면 안 된다/],
  ["schema semantics", /## 6\. Schema 의미론/],
  ["document surface", /find[\s\S]*insert[\s\S]*replace[\s\S]*delete[\s\S]*move[\s\S]*duplicate[\s\S]*copy[\s\S]*cut[\s\S]*paste[\s\S]*undo[\s\S]*redo[\s\S]*canFind[\s\S]*canInsert[\s\S]*canRedo/],
  ["strict semantics", /기본값은 `strict: false`/],
  ["selection semantics", /selection은 DOM focus가 아니라 headless document data다/],
  ["semantic fixture lock", /Semantic fixture[\s\S]*result code[\s\S]*strict 기본값[\s\S]*실패 atomicity/],
  ["signature fixture lock", /Signature fixture[\s\S]*overload[\s\S]*call shape/],
  ["clipboard spread", /직접 array payload를 `insert\(target, payload, \{ spread: true \}\)`로 넣으면[\s\S]*item별 sibling insert/],
  ["history semantics", /history는 undo\/redo control surface/],
  ["breaking change", /breaking change로\s+취급해야 한다/],
  ["adapter pressure", /form editing[\s\S]*storage, history, collaboration bridge/],
  ["conformance", /적합성 suite는 public package entrypoint에서만 import해야 한다/],
]) {
  requirePattern("core standard", standard, pattern);
}

for (const [label, pattern] of [
  ["documented profile", /1\.0의 conformance profile은 문서화된 profile/],
  ["no runner package", /별도 npm package[\s\S]*CLI runner[\s\S]*1\.0 범위에 포함하지 않는다/],
  ["public entrypoint", /public package entrypoint/],
  ["profile artifacts", /public-contract\.json[\s\S]*signature-contract\.test-d\.ts[\s\S]*semantic-contract\.test\.ts[\s\S]*result-contract\.test\.ts[\s\S]*standard-conformance\.test\.ts/],
  ["included semantics", /JSON Pointer[\s\S]*JSONPath[\s\S]*selectionAfter[\s\S]*clipboard[\s\S]*undo\/redo/],
  ["excluded surfaces", /official extension[\s\S]*lab extension[\s\S]*DOM focus/],
  ["breaking criteria", /breaking change[\s\S]*public export[\s\S]*error code[\s\S]*selectionAfter/],
]) {
  requirePattern("conformance profile", conformanceProfile, pattern);
}

for (const token of [
  "src/index.ts",
  "src/react.ts",
  "application/document",
  "domain/schema",
  "domain/selection",
  "foundation/patch",
  "foundation/json",
  "foundation/pointer",
]) {
  if (standard.includes(token)) fail(`core standard: internal source path leaked: ${token}.`);
}

for (const [label, pattern] of [
  ["foundation tree", /RFC급 foundation/],
  ["normative artifact", /core-standard\.md/],
  ["conformance profile artifact", /conformance-profile\.md/],
  ["result freeze artifact", /result-contract\.md/],
  ["selection freeze artifact", /selection-contract\.md/],
  ["schema freeze artifact", /schema-introspection-contract\.md/],
  ["conformance artifact", /standard-conformance\.test\.ts/],
  ["semantic fixture artifact", /semantic-contract\.test\.ts/],
  ["signature fixture artifact", /signature-contract\.test-d\.ts/],
  ["evaluator artifact", /evaluate-standardization\.mjs/],
  ["adapter pressure", /form[\s\S]*table\/data-grid[\s\S]*outliner\/tree[\s\S]*rich text[\s\S]*storage\/collaboration/i],
]) {
  requirePattern("foundation gate", foundationGate, pattern);
}

for (const [label, pattern] of [
  ["json result shape", /## JSONResult[\s\S]*invalid_pointer[\s\S]*schema_violation/],
  ["capability result shape", /## JSONCapabilityResult[\s\S]*CapabilityErrorCode[\s\S]*violations\[\]\.path/],
  ["preflight and clipboard codes", /preflight_failed[\s\S]*empty_clipboard/],
  ["schema violation path modes", /schema-slot[\s\S]*document-result/],
  ["breaking changes", /## Breaking Change[\s\S]*error code/],
]) {
  requirePattern("result contract", resultContract, pattern);
}

for (const [label, pattern] of [
  ["selection mode", /## SelectionMode[\s\S]*`single`[\s\S]*`multiple`[\s\S]*`extended`/],
  ["selection snap", /## SelectionSnap[\s\S]*selectedPointers[\s\S]*selectionRanges[\s\S]*primaryIndex/],
  ["selection after", /selectionAfter[\s\S]*history entry/],
  ["text edit codes", /missing_length[\s\S]*multi_pointer_range[\s\S]*overlapping_ranges[\s\S]*not_string/],
  ["non-goals", /DOM focus[\s\S]*2D marquee[\s\S]*stable object id resolver/],
]) {
  requirePattern("selection contract", selectionContract, pattern);
}

for (const [label, pattern] of [
  ["schema state", /## SchemaState[\s\S]*accepts/],
  ["path mode", /SchemaPathMode[\s\S]*`value`[\s\S]*`insert`/],
  ["schema kind", /SchemaKind[\s\S]*discriminatedUnion[\s\S]*nullable/],
  ["description", /SchemaDescription[\s\S]*jsonSchema[\s\S]*discriminator/],
  ["schema slot result", /schema-slot[\s\S]*document-result/],
  ["capability result", /JSONCapabilityResult[\s\S]*schema_violation/],
]) {
  requirePattern("schema introspection contract", schemaIntrospectionContract, pattern);
}

if (!/from "@interactive-os\/json-document\/session"/.test(conformance)) {
  fail("1.x standard conformance: must import from the Session baseline.");
}
if (/from "\.\.|from '\.\.|\/src\//.test(conformance)) {
  fail("standard conformance: must not import implementation-private modules.");
}
for (const [label, pattern] of [
  ["jsonpath query", /query\("\$\.columns\[\*\]\.cards\[\*\]\.id"\)/],
  ["json pointer mutation", /path: "\/columns\/0\/cards\/0\/title"/],
  ["capability purity", /keeps capability probes reasoned and mutation-free/],
  ["selection history", /commits patch and final selection as one history step/],
  ["clipboard insert split", /uses insert for explicit payloads/],
  ["subscriber atomicity", /only after successful atomic changes/],
]) {
  requirePattern("standard conformance", conformance, pattern);
}

if (!/from "@interactive-os\/json-document\/session"/.test(semanticContract)) {
  fail("1.x semantic contract: must import from the Session baseline.");
}
if (/from "\.\.|from '\.\.|\/src\//.test(semanticContract)) {
  fail("semantic contract: must not import implementation-private modules.");
}
for (const [label, pattern] of [
  ["fixture suite", /json-document 1\.0 semantic contract fixtures/],
  ["stable result codes", /invalid_pointer[\s\S]*schema_violation[\s\S]*empty_stack[\s\S]*empty_clipboard[\s\S]*not_serializable/],
  ["strict policy", /strict policy[\s\S]*strict: true[\s\S]*JSONDocumentError/],
  ["failed mutation atomicity", /failed mutation atomicity[\s\S]*undoDepth[\s\S]*observed\)\.toEqual\(\[\]\)/],
  ["clipboard and selection history", /clipboard spread[\s\S]*selection history[\s\S]*undo\(\)[\s\S]*redo\(\)/],
]) {
  requirePattern("semantic contract", semanticContract, pattern);
}

if (!/from "@interactive-os\/json-document\/session"/.test(signatureContract)) {
  fail("1.x signature contract: must import from the Session baseline.");
}
if (!/from "@interactive-os\/json-document\/react"/.test(signatureContract)) {
  fail("signature contract: must import React from the public react package.");
}
if (/from "\.\.|from '\.\.|\/src\//.test(signatureContract)) {
  fail("signature contract: must not import implementation-private modules.");
}
for (const [label, pattern] of [
  ["fixture type", /signature-contract\.test-d\.ts/],
  ["create overload", /ExpectedCreateJSONDocument[\s\S]*TrustedInitialDocumentOptions[\s\S]*UntrustedInitialDocumentOptions/],
  ["react overload", /ExpectedUseJSONDocument[\s\S]*TrustedInitialDocumentOptions[\s\S]*UntrustedInitialDocumentOptions/],
  ["document surface", /ExpectedJSONDocument[\s\S]*insert\(target[\s\S]*move\(source[\s\S]*paste\(target[\s\S]*canPaste\(target/],
  ["patch helpers", /ExpectedPatchHelpers[\s\S]*applyOperation[\s\S]*applyPatchToTrustedState/],
  ["placement shapes", /JSONDocumentPasteTarget[\s\S]*before[\s\S]*after[\s\S]*into[\s\S]*replace/],
  ["negative shape", /@ts-expect-error[\s\S]*\{ at \}/],
]) {
  requirePattern("signature contract", signatureContract, pattern);
}

if (!publicContract.session.values.includes("createJSONDocument")) {
  fail("Session baseline contract: missing createJSONDocument.");
}
if (!publicContract.react.values.includes("useJSONDocument")) {
  fail("public contract: missing useJSONDocument.");
}
for (const requiredType of [
  "JSONDocument",
  "JSONCapabilityResult",
  "JSONDocumentInsertTarget",
  "JSONDocumentInsertOptions",
  "JSONDocumentMoveTarget",
  "SelectionSnap",
  "ClipboardPasteResult",
  "JSONDocumentHistory",
]) {
  if (!publicContract.session.types.includes(requiredType)) {
      fail(`Session baseline contract: missing ${requiredType}.`);
  }
}

validateV2PublicSurface(
  v2PublicSurface,
  v2ProjectionProfile,
  publicContract,
  signatureContract,
  v2SignatureContract,
  v2ProjectionVectors,
  v2ProjectionSuite,
  v2ProjectionReference,
  v2ProtocolVectors,
  v2ProtocolSuite,
  v2ProtocolReference,
  v2PointerVectors,
  v2PointerSuite,
  v2PointerReference,
  v2RFC6902Suite,
  v2RFC6902Reference,
  v2JSONPathSuite,
  v2JSONPathReference,
  libraryPackage.version,
);

if (!rootPackage.scripts?.["standard:check"]) {
  fail("package scripts: missing standard:check.");
}
if (!rootPackage.scripts?.["release:check"]?.includes("standard:check")) {
  fail("package scripts: release:check must include standard:check.");
}

if (!libraryPackage.files?.includes("public-contract.json")) {
  fail("json-document package: public-contract.json must be published with the package.");
}
