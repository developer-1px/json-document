// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { apiReferencePackages } from "../../../docs/api-reference/packages.mjs";
import { validateLlmsContract, validatePublicPackageReferences } from "../../../docs/public-contract-checks.mjs";

const llms = readFileSync(new URL("../../../docs/public/llms.txt", import.meta.url), "utf8");
const publicContract = JSON.parse(readFileSync(new URL("../../../packages/json-document/public-contract.json", import.meta.url), "utf8"));
const symbolCount = publicContract.root.values.length + publicContract.root.types.length;

function findings(source: string) {
  const errors: string[] = [];
  validateLlmsContract(source, (message: string) => errors.push(message));
  return errors;
}

describe("public documentation contract", () => {
  test("accepts the exact published llms source against the canonical Core contract", () => {
    expect(symbolCount).toBe(23);
    expect(findings(llms)).toEqual([]);
  });

  test.each([
    ["old Root symbol count", llms.replace(`${symbolCount}개 symbol`, "21개 symbol")],
    ["missing v3 title", llms.replace("# json-document v3", "# json-document")],
    ["missing six-member contract", llms.replace("`JSONDocument`의 필수 member는 정확히 여섯 개다", "JSON Document")],
    ["missing companion boundary", llms.replace("## Adapter, Connector와 companion", "## Integrations")],
    ["missing migration boundary", llms.replaceAll("@interactive-os/editable", "retired editor")],
  ])("rejects %s", (_name, source) => {
    expect(source).not.toBe(llms);
    expect(findings(source)).not.toEqual([]);
  });

  test("accepts every package registered at the canonical documentation owner", () => {
    const references = apiReferencePackages.map(({ packageName }) => packageName).join("\n");
    const errors: string[] = [];
    validatePublicPackageReferences(references, (message: string) => errors.push(message));
    expect(errors).toEqual([]);
    expect(findings(`${llms}\n${references}`)).toEqual([]);
  });

  test.each([
    "@interactive-os/json-document-removed-extension",
    "@interactive-os/json-document/session",
    "@interactive-os/json-document/react",
    "labs/extensions",
  ])("rejects retired reference %s in docs and llms", (reference) => {
    const errors: string[] = [];
    validatePublicPackageReferences(reference, (message: string) => errors.push(message));
    expect(errors).not.toEqual([]);
    expect(findings(`${llms}\n${reference}`)).not.toEqual([]);
  });

  test.each([
    "../../../docs/evaluate.mjs",
    "../../scripts/evaluate.mjs",
    "../../scripts/evaluate-live.mjs",
  ])("keeps %s wired to the canonical llms validator", (path) => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    expect(/import\s*\{[^}]*validateLlmsContract[^}]*\}\s*from\s*["'][^"']*public-contract-checks\.mjs["']/.test(source)).toBe(true);
    expect(/validateLlmsContract(?:\(|\s*:)/.test(source)).toBe(true);
    expect(source).not.toContain("21개 symbol");
    expect(source).not.toContain("activeCompanionPackages");
  });
});
