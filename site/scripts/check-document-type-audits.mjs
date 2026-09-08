import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../..", import.meta.url).pathname;
const ledger = JSON.parse(readFileSync(join(root, "audits/document-types.json"), "utf8"));
const siteRoutes = JSON.parse(readFileSync(join(root, "site/site-routes.json"), "utf8"));
const allowed = new Set(["canonical consumer", "Host composition", "duplicate implementation", "canonical API gap", "missing canonical module", "mislocated module", "out of scope", "unverified"]);
const expectedCandidates = siteRoutes
  .filter((route) => route.navigationGroup === "Document Types" && route.path !== "/docs/document-types")
  .map((route) => route.path.slice("/docs/document-types/".length));

if (JSON.stringify(ledger.candidates) !== JSON.stringify(expectedCandidates)) throw new Error("Document Type audit candidates do not match the TBD navigation denominator");

for (const candidate of ledger.candidates) {
  const profile = ledger.candidateProfiles[candidate];
  if (profile === undefined) throw new Error(`${candidate} is missing its candidate profile`);
  for (const field of ["why", "does", "schema", "sourcePath", "symbol"]) {
    if (typeof profile[field] !== "string" || profile[field].trim() === "") throw new Error(`${candidate} candidate profile is missing ${field}`);
  }
  if (!Array.isArray(profile.fields) || profile.fields.length === 0) throw new Error(`${candidate} candidate profile is missing field descriptions`);
  for (const field of profile.fields) {
    if (typeof field.name !== "string" || field.name.trim() === "" || typeof field.description !== "string" || field.description.trim() === "") {
      throw new Error(`${candidate} candidate profile has an incomplete field description`);
    }
  }
  const sourceFile = join(root, profile.sourcePath);
  if (!existsSync(sourceFile)) throw new Error(`${candidate} candidate profile source does not exist: ${profile.sourcePath}`);
  if (!new RegExp(`\\b${profile.symbol}\\b`).test(readFileSync(sourceFile, "utf8"))) throw new Error(`${candidate} candidate profile symbol does not exist: ${profile.symbol}`);
}

for (const [candidate, audit] of Object.entries(ledger.audits)) {
  if (!ledger.candidates.includes(candidate)) throw new Error(`unknown Document Type audit: ${candidate}`);
  if (audit.denominator !== audit.occurrences.length) throw new Error(`${candidate} audit denominator mismatch: expected ${audit.denominator}, found ${audit.occurrences.length}`);
  const ids = new Set();
  for (const occurrence of audit.occurrences) {
    if (ids.has(occurrence.id)) throw new Error(`${candidate} duplicate occurrence id: ${occurrence.id}`);
    ids.add(occurrence.id);
    if (!allowed.has(occurrence.disposition)) throw new Error(`${candidate}/${occurrence.id} has invalid disposition: ${occurrence.disposition}`);
    for (const field of ["role", "knowledge", "decision", "changeReason", "stateLifecycle", "inputsOutputs", "currentOwner", "canonicalEvidence", "sourcePath", "intendedOwner", "nextCheck"]) {
      if (typeof occurrence[field] !== "string" || occurrence[field].trim() === "") throw new Error(`${candidate}/${occurrence.id} is missing ${field}`);
    }
    const sourceFile = join(root, occurrence.sourcePath);
    if (!existsSync(sourceFile)) throw new Error(`${candidate}/${occurrence.id} source does not exist: ${occurrence.sourcePath}`);
    if (occurrence.symbol && !new RegExp(`\\b${occurrence.symbol}\\b`).test(readFileSync(sourceFile, "utf8"))) {
      throw new Error(`${candidate}/${occurrence.id} symbol does not exist: ${occurrence.symbol}`);
    }
  }
}

const calendar = ledger.audits.calendar;
for (const role of ["Document Model", "Validation", "Projection", "Document Operation", "Editing lifecycle", "Affordance", "Web Adapter", "Hand composition", "Reusable UI behavior", "Host composition"]) {
  if (!calendar.occurrences.some((occurrence) => occurrence.role === role)) throw new Error(`Calendar audit is missing role: ${role}`);
}
if (calendar.status !== "audited-tbd" || !calendar.occurrences.some((occurrence) => !["canonical consumer", "Host composition"].includes(occurrence.disposition))) {
  throw new Error("Calendar must remain audited-tbd while nonconforming occurrences remain");
}

console.log(`Document Type audits ok; candidates=${ledger.candidates.length}; candidate profiles=${Object.keys(ledger.candidateProfiles).length}; audited=${Object.keys(ledger.audits).length}; Calendar occurrences=${calendar.occurrences.length}.`);
