import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, expect, test} from "vitest";
import {createUIComponentObject, type UIComponentObject} from "@interactive-os/json-document-object-document";
import {UIComponentSurface} from "../src/ui-component-view.js";

afterEach(cleanup);
test("empty bound descriptions do not invent a result state; explicit copy gives the next action", () => {
  const object=createUIComponentObject("card",{x:0,y:0},{text:"업무 설명"}) as UIComponentObject;
  const empty={...object,document:{...object.document,detail:"",bindings:[{target:"detail" as const,mode:"value" as const,tableId:"tasks",fieldId:"description",recordId:""}]}};
  const view=render(<UIComponentSurface object={empty} />);
  expect(screen.queryByText(/아직 결과/)).toBeNull();
  view.rerender(<UIComponentSurface object={{...empty,document:{...empty.document,props:{emptyMessage:"브리핑을 생성하세요."}}}} />);
  expect(screen.getByText("브리핑을 생성하세요.")).toBeTruthy();
  view.rerender(<UIComponentSurface object={{...empty,document:{...empty.document,detail:"실제 업무 설명",props:{emptyMessage:"브리핑을 생성하세요."}}}} />);
  expect(screen.queryByText("브리핑을 생성하세요.")).toBeNull();
  expect(screen.getByText("실제 업무 설명")).toBeTruthy();
});
