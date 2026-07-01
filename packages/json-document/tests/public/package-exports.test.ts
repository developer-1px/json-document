import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as rootApi from "@interactive-os/json-document";
import * as reactApi from "@interactive-os/json-document/react";
import * as patchApi from "@interactive-os/json-document/patch";
import * as pointerApi from "@interactive-os/json-document/pointer";
import * as textSurfaceApi from "@interactive-os/json-document/text-surface";
import * as schemaApi from "@interactive-os/json-document/schema";
import * as selectionApi from "@interactive-os/json-document/selection";
import * as clipboardApi from "@interactive-os/json-document/clipboard";

const packageRoot = resolve(__dirname, "..", "..");
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { import?: string; types?: string }>;
};
const publicContract = JSON.parse(readFileSync(resolve(packageRoot, "public-contract.json"), "utf8")) as {
  root: { values: string[]; types: string[] };
  react: { values: string[]; types: string[] };
  patch: { values: string[]; types: string[] };
  pointer: { values: string[]; types: string[] };
  selection: { values: string[]; types: string[] };
  textSurface: { values: string[]; types: string[] };
  schema: { values: string[]; types: string[] };
  clipboard: { values: string[]; types: string[] };
};

const publicEntrypoints = {
  root: { subpath: ".", runtime: rootApi },
  react: { subpath: "./react", runtime: reactApi },
  patch: { subpath: "./patch", runtime: patchApi },
  pointer: { subpath: "./pointer", runtime: pointerApi },
  selection: { subpath: "./selection", runtime: selectionApi },
  textSurface: { subpath: "./text-surface", runtime: textSurfaceApi },
  schema: { subpath: "./schema", runtime: schemaApi },
  clipboard: { subpath: "./clipboard", runtime: clipboardApi },
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
