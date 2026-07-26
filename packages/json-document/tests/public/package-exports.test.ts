import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as rootApi from "@interactive-os/json-document";
import * as reactApi from "@interactive-os/json-document/react";
import * as sessionApi from "@interactive-os/json-document/session";

const packageRoot = resolve(__dirname, "..", "..");
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { import?: string; types?: string }>;
};
const publicContract = JSON.parse(readFileSync(resolve(packageRoot, "public-contract.json"), "utf8")) as {
  root: { values: string[]; types: string[] };
  session: { values: string[]; types: string[] };
  react: { values: string[]; types: string[] };
};

const publicEntrypoints = {
  root: { subpath: ".", runtime: rootApi },
  session: { subpath: "./session", runtime: sessionApi },
  react: { subpath: "./react", runtime: reactApi },
} as const;

describe("package exports", () => {
  test("every export points at public dist js and type paths", () => {
    for (const [subpath, target] of Object.entries(packageJson.exports)) {
      expect(
        Object.keys(target),
        `${subpath} must expose exactly the supported export conditions`,
      ).toEqual(["types", "import"]);
      expect(target.import, `${subpath} missing import condition`).toBeTruthy();
      expect(target.types, `${subpath} missing types condition`).toBeTruthy();
      expect(target.import, `${subpath} import target must point to built ESM`).toMatch(/^\.\/dist\/.+\.js$/);
      expect(target.types, `${subpath} types target must point to built declarations`).toMatch(/^\.\/dist\/.+\.d\.ts$/);
    }
  });

  test("package subpaths match public-contract.json entrypoints", () => {
    expect(Object.keys(packageJson.exports).sort()).toEqual(
      Object.values(publicEntrypoints).map(({ subpath }) => subpath).sort(),
    );
  });

  test("runtime value exports match public-contract.json", () => {
    for (const [name, entrypoint] of Object.entries(publicEntrypoints)) {
      const contract = publicContract[name as keyof typeof publicContract];
      expect(Object.keys(entrypoint.runtime).sort()).toEqual([...contract.values].sort());
    }
  });
});
