import { useState, type ReactNode } from "react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { readUIBuilderProject, getUIBuilderPageObjects, getUIBuilderRootObjects, resolveUIBuilderComponent, type ObjectEditor, type UIBuilderRecordSelection } from "@interactive-os/json-document-editing";
import { assertUIBuilderDocument, type UIComponentObject } from "@interactive-os/json-document-object-document";
import { CanvasHand } from "./canvas-hand.js";
import { UIComponentView, UIComponentSurface } from "./ui-component-view.js";
import { UIBuilderScreenControls } from "./ui-builder-screen-controls.js";
export { UIBuilderComponentProperties } from "./ui-builder-screen-controls.js";

/** A constrained Canvas Hand. Spatial interaction and history remain owned by Canvas/Object. */
export function UIBuilderHand({ editor, toolbarContent, recordSelection }: { readonly editor: ObjectEditor; readonly toolbarContent?: ReactNode; readonly recordSelection?: UIBuilderRecordSelection }) {
  const snapshot = useEditingSnapshot(editor);
  assertUIBuilderDocument(snapshot.value);
  const project = readUIBuilderProject(snapshot.value);
  const pageObjects = getUIBuilderPageObjects(project);
  const roots = getUIBuilderRootObjects(pageObjects as readonly UIComponentObject[]);
  function renderComponent(id: string, absolute = false): ReactNode {
    const object = pageObjects.find(object => object.id === id) as UIComponentObject;
    const projected = resolveUIBuilderComponent(project, object, recordSelection);
    const props = {object: projected.object, designId: project.designId, issues: projected.issues, collection: projected.collection, renderChildren: (ids: readonly string[]) => ids.map(id => <div key={id}>{renderComponent(id)}</div>)};
    return absolute ? <UIComponentView {...props} /> : <UIComponentSurface {...props} />;
  }
  const [editing, setEditing] = useState(false);
  return <>
    <CanvasHand objectIds={roots.map(object => object.id)} workspace navigation="fixed" editor={editor} className="ui-builder-hand" label="UI 작업면"
      creationStyle={{ color: "transparent", textColor: "#222222", fontSize: 16, strokeWidth: 1 }}
      creationTools={[]} documentControls={false} contentToolbar={false}
      renderEmbedded={object => renderComponent(object.id, true)} onEditEmbedded={() => setEditing(true)}
      toolbarContent={<><UIBuilderScreenControls editor={editor} commands={false} contentEditing={editing} onContentEditingChange={setEditing} />{toolbarContent}</>} />
    {pageObjects.length === 0 && <div className="ui-builder-empty" aria-live="polite"><h1>어떤 화면을 만들까요?</h1><p>컴포넌트를 놓고 자유롭게 움직여보세요.<br />정리가 필요하면 AI에게 말해주세요.</p></div>}
  </>;
}
