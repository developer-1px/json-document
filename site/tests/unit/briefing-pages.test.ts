import { describe, expect, it } from "vitest";
import { executeUIBuilderAction, getUIBuilderPageObjects, readUIBuilderProject } from "@interactive-os/json-document-editing";
import { createBriefingExample, briefingMockSkills } from "../../src/applications/ui-builder/briefing-example.js";

describe("fresh briefing multi-page fixture", () => {
  it("starts at home and exposes separate result navigation without losing task data", () => {
    const editor = createBriefingExample();
    const project = readUIBuilderProject(editor.snapshot.value);
    expect(project.activePageId).toBe("page:main");
    expect(project.pages.map(page => page.id)).toEqual(["page:main", "page:results"]);
    const home = getUIBuilderPageObjects(project, "page:main");
    const results = getUIBuilderPageObjects(project, "page:results");
    const links = (objects: typeof home) => objects.filter(object => object.kind === "embedded-document" && object.document.component === "page-link");
    expect(links(home)).toHaveLength(1);
    expect(links(results)).toHaveLength(1);
    expect(project.tables[0]!.data.records).toHaveLength(3);
    const flowIds = project.flow!.rows.flatMap(row => row.columns.flatMap(column => column.items.map(item => item.objectId)));
    expect(new Set(flowIds)).toEqual(new Set(project.objects.map(object => object.id)));
  });
  it("completion requires a result and uses the registered completion skill", async () => {
    const editor = createBriefingExample();
    expect(readUIBuilderProject(editor.snapshot.value).actions.find(action => action.id === "complete")?.execution?.skill).toBe("mock.complete");
    const result = await executeUIBuilderAction(editor, "complete", briefingMockSkills, {tasks: "task-101"});
    expect(result.ok).toBe(false);
    expect(readUIBuilderProject(editor.snapshot.value).tables[0]!.data.records[0]!.values.state).toBe("브리핑 전");
  });
});
