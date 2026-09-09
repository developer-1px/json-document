import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateSiteRoutes } from "./route-checks.mjs";

const root = { path: "/", label: "Home", title: "Home", description: "Home page" };
const route = (path, extra = {}) => ({ path, title: path, description: `About ${path}`, label: "Overview", ...extra });
const errors = (routes) => {
  const failures = [];
  validateSiteRoutes(routes, (failure) => failures.push(failure));
  return failures;
};

test("validates the real site registry and separate section landings", () => {
  assert.deepEqual(errors(JSON.parse(readFileSync(new URL("../site-routes.json", import.meta.url), "utf8"))), []);
  assert.deepEqual(errors([root, route("/docs/foundation", { sidebar: false }), route("/docs/building-blocks", { sidebar: false })]), []);
});

test("rejects duplicate visible sibling labels and invalid documentation paths", () => {
  assert.deepEqual(errors([root, route("/docs/one", { navigationGroup: "Editing" }), route("/docs/two", { navigationGroup: "Editing" })]), [
    "site navigation group contains duplicate label Overview.",
  ]);
  assert.deepEqual(errors([root, route("/docs/one", { documentSource: "../private.md" })]), [
    "site route /docs/one has an invalid documentation source.",
  ]);
});
