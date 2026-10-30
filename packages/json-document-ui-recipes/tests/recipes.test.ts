import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { recipeSpecs } from "../src/index.js";

// The profile's requirement table is the source of rule IDs.
const profile = readFileSync(new URL("../../../standards/ui-recipes-v1/profile.md", import.meta.url), "utf8");
const requirements = [...profile.matchAll(/\| (UIR1-[A-Z]+-[0-9]{3}) \|/g)].map((match) => match[1]);
const kebab = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

describe("UI Recipes v1", () => {
  it("defines unique requirement IDs", () => {
    expect(requirements.length).toBeGreaterThan(0);
    expect(new Set(requirements).size).toBe(requirements.length);
  });

  it("gives every rule to one recipe", () => {
    const rules = recipeSpecs.flatMap(({ recipe }) => recipe.rules.map((rule) => rule.id));
    expect(new Set(rules).size).toBe(rules.length);
    expect(new Set(recipeSpecs.map(({ recipe }) => recipe.id)).size).toBe(recipeSpecs.length);
  });

  for (const { recipe, vectors } of recipeSpecs) {
    describe(recipe.id, () => {
      it("UIR1-RECIPE-001: has a kebab-case id and three or more evidence products", () => {
        expect(recipe.id).toMatch(kebab);
        expect(recipe.evidence.length).toBeGreaterThanOrEqual(3);
        for (const evidence of recipe.evidence) expect(evidence.url).toMatch(/^https:\/\//);
      });

      it("UIR1-RECIPE-002: declares non-overlapping kebab-case slots", () => {
        const { required, optional } = recipe.anatomy;
        expect(required.length).toBeGreaterThan(0);
        for (const slot of [...required, ...optional]) expect(slot).toMatch(kebab);
        expect(required.filter((slot) => optional.includes(slot))).toEqual([]);
      });

      it("UIR1-RECIPE-003: rules are profile requirements", () => {
        expect(recipe.rules.length).toBeGreaterThan(0);
        for (const rule of recipe.rules) {
          expect(requirements).toContain(rule.id);
          expect(rule.name).toMatch(kebab);
        }
      });

      it("UIR1-RECIPE-004: every rule is exercised by a vector case", () => {
        expect(vectors.recipe).toBe(recipe.id);
        const rules = new Set(recipe.rules.map((rule) => rule.id));
        const contents = new Set(vectors.fixture.contents.map((content) => content.id));
        const variants = new Set(recipe.variants.map((variant) => variant.id));
        const covered = new Set<string>();
        expect(new Set(vectors.cases.map((entry) => entry.id)).size).toBe(vectors.cases.length);
        for (const entry of vectors.cases) {
          for (const requirement of entry.requirements) {
            expect(rules, `${entry.id}: ${requirement}`).toContain(requirement);
            covered.add(requirement);
          }
          for (const variant of Object.keys(entry.variants ?? {})) expect(variants).toContain(variant);
          expect(entry.steps.some((step) => "expect" in step), `${entry.id} observes a result`).toBe(true);
          for (const step of entry.steps) if ("content" in step && step.content) expect(contents).toContain(step.content);
        }
        expect([...rules].filter((rule) => !covered.has(rule))).toEqual([]);
      });

      it("UIR1-RECIPE-005: carries no visual token values", () => {
        expect(JSON.stringify(recipe)).not.toMatch(/#[0-9a-f]{3,8}\b|\b\d+(?:px|rem|em)\b|\b(?:rgb|hsl)a?\(/i);
      });
    });
  }
});
