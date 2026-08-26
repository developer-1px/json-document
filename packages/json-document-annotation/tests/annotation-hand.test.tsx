import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ANNOTATION_PROFILE_V1, createAnnotationEditor, type AnnotationDocument } from "@interactive-os/json-document-editing";
import { AnnotationHand, annotationTools } from "../src/index.js";

const document: AnnotationDocument = { profile: ANNOTATION_PROFILE_V1, id: "test", sources: [{ id: "image", src: "/image.png", width: 100, height: 80 }], annotations: [] };
const rasterStyle = { stroke: "red", fill: "red", lineWidth: 2, labelFont: "12px sans-serif" };

describe("AnnotationHand", () => {
  test("publishes one descriptor for every default tool", () => {
    expect(annotationTools.map(({ id, shortcut }) => [id, shortcut])).toEqual([["select", "V"], ["comment", "C"], ["draw", "D"], ["arrow", "A"], ["like", "L"], ["dislike", "K"]]);
  });

  test("renders the canonical canvas and configurable tool set", () => {
    render(<AnnotationHand editor={createAnnotationEditor(document)} sourceUrl="/image.png" createId={() => "next"} rasterStyle={rasterStyle} enabledTools={["select", "comment"]} />);
    expect(screen.getByRole("application", { name: "Raster annotation canvas" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Draw" })).toBeNull();
    expect(JSON.parse(screen.getByTestId("annotation-structured-output").textContent ?? "null")).toEqual(document);
  });
});
