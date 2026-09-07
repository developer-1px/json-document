import { readFileSync } from "node:fs";
import { apiReferencePackages } from "./api-reference/packages.mjs";

const publicContract = JSON.parse(readFileSync(new URL("../packages/json-document/public-contract.json", import.meta.url), "utf8"));
const rootSymbolCount = publicContract.root.values.length + publicContract.root.types.length;
const publicPackages = new Set(apiReferencePackages.map(({ packageName }) => packageName));

/** Shared by source, artifact, and live documentation verification; no transport. */
export function validatePublicPackageReferences(source, fail) {
  if (/@interactive-os\/json-document\/(?:session|react)\b/.test(source)) {
    fail("removed package subpath is still documented.");
  }
  for (const match of source.matchAll(/@interactive-os\/json-document-[a-z0-9-]+\b/g)) {
    if (!publicPackages.has(match[0])) {
      fail(`removed json-document extension is still documented as current: ${match[0]}.`);
    }
  }
  if (/\blabs\/extensions\b/.test(source)) {
    fail("removed lab path is still documented as current.");
  }
}

/** Validate llms.txt against the current Core contract and documented ecosystem. */
export function validateLlmsContract(source, fail) {
  for (const [pattern, requirement] of [
    [/^# json-document v3$/m, "v3 title"],
    [new RegExp(`공개 Root는 정확히 다음 ${rootSymbolCount}개 symbol`), `${rootSymbolCount} Root symbols`],
    [/`JSONDocument`의 필수 member는 정확히 여섯 개다/, "six-member JSONDocument contract"],
    [/## Adapter, Connector와 companion/, "Adapter, Connector and companion boundary"],
    [/@interactive-os\/editable/, "migration boundary for @interactive-os/editable"],
  ]) {
    if (!pattern.test(source)) fail(`llms.txt is missing ${requirement}.`);
  }
  validatePublicPackageReferences(source, fail);
}
