import {expect, test} from "@playwright/test";

test("Sheet selects ranges, edits deliberately, moves, copies, pastes and undoes structure", async ({page}) => {
 const problems: string[] = []; page.on("pageerror", error => problems.push(error.message));
 await page.goto("/demo/sheet");
 const grid = page.getByRole("grid",{name:"Project sheet"});
 const cells = grid.getByRole("gridcell");
 await cells.nth(0).click(); await cells.nth(4).click({modifiers:["Shift"]});
 await expect(grid.locator('[data-selected="true"]')).toHaveCount(4);
 await cells.nth(4).press("ControlOrMeta+c");
 await cells.nth(7).click(); await cells.nth(7).press("ControlOrMeta+v");
 await expect(cells.nth(7)).toHaveText("Alpha");
 await page.getByRole("button",{name:"실행 취소",exact:true}).click();
 await expect(cells.nth(7)).toHaveText("Review");
 await cells.nth(0).click(); await cells.nth(0).press("ArrowRight"); await expect(cells.nth(1)).toBeFocused();
 await cells.nth(1).press("F2");
 const input=grid.getByRole("textbox"); await input.fill("Changed"); await input.press("Escape");
 await expect(cells.nth(1)).toHaveText("Draft");
 await cells.nth(1).press("F2"); await input.fill("Changed"); await input.press("Tab");
 await expect(cells.nth(1)).toHaveText("Changed"); await expect(cells.nth(2)).toBeFocused();
 await cells.nth(2).press("Shift+Tab"); await expect(cells.nth(1)).toBeFocused();
 await page.getByRole("button",{name:"열 추가",exact:true}).click(); await expect(cells).toHaveCount(16);
 await page.getByRole("button",{name:"실행 취소",exact:true}).click(); await expect(cells).toHaveCount(12);
 await page.getByRole("button",{name:"행 추가",exact:true}).click(); await expect(cells).toHaveCount(15);
 await page.getByRole("button",{name:"실행 취소",exact:true}).click(); await expect(cells).toHaveCount(12);
 await cells.nth(0).click(); await cells.nth(0).press("ControlOrMeta+a"); await cells.nth(0).press("ControlOrMeta+a");
 await expect(grid.locator('[data-selected="true"]')).toHaveCount(12);
 expect(problems).toEqual([]);
});

test("Bear table shares Sheet controls and document history without serializing UI", async ({page}) => {
 const problems: string[] = []; page.on("pageerror", error => problems.push(error.message));
 await page.goto("/applications/bear");
 const grid = page.getByRole("grid",{name:"표 편집"}); const cells=grid.getByRole("gridcell");
 await expect(cells).toHaveCount(6);
 await cells.nth(2).dblclick(); const input=grid.getByRole("textbox");
 await input.fill("새 제목"); await input.press("Enter"); await expect(cells.nth(2)).toHaveText("새 제목");
 await page.getByRole("button",{name:"실행 취소",exact:true}).click(); await expect(cells.nth(2)).toHaveText("제목");
 await page.getByRole("button",{name:"다시 실행",exact:true}).click(); await expect(cells.nth(2)).toHaveText("새 제목");
 await cells.nth(2).click(); await page.getByRole("button",{name:"행 추가",exact:true}).click(); await expect(cells).toHaveCount(8);
 await page.getByRole("button",{name:"실행 취소",exact:true}).click(); await expect(cells).toHaveCount(6);
 await cells.nth(0).click(); await expect(page.getByRole("button",{name:"행 삭제",exact:true})).toBeDisabled();
 await expect(page.getByText("생각이 머무는 곳.",{exact:true})).toBeVisible();
 await cells.last().click(); await cells.last().press("Tab");
 await expect(page.getByRole("textbox",{name:"Markdown 문서",exact:true})).toBeFocused();
 await page.keyboard.type("after table");
 await expect(cells).toHaveCount(6);
 expect(problems).toEqual([]);
});

test("Sheet keeps native text selection and restores disjoint ranges after clearing", async ({page}) => {
 await page.goto("/demo/sheet"); const grid=page.getByRole("grid"); const cells=grid.getByRole("gridcell");
 await cells.nth(0).click(); await cells.nth(11).click({modifiers:["Meta"]}); await cells.nth(7).click({modifiers:["Shift"]});
 await expect(grid.locator('[data-selected="true"]')).toHaveCount(5);
 await cells.nth(7).press("Delete"); await expect(cells.nth(0)).toHaveText(/\s*/);
 await page.getByRole("button",{name:"실행 취소",exact:true}).click(); await expect(cells.nth(0)).toHaveText("Alpha");
 await expect(grid.locator('[data-selected="true"]')).toHaveCount(5);
 await cells.nth(0).dblclick(); const input=grid.getByRole("textbox");
 await input.press("ControlOrMeta+a"); await expect.poll(() => input.evaluate((node: HTMLInputElement) => [node.selectionStart,node.selectionEnd])).toEqual([0,5]);
 await input.press("ArrowLeft"); await expect(input).toBeFocused();
 await input.press("Escape"); await cells.nth(0).click(); await cells.nth(0).press("Shift+ArrowRight");
 await expect(grid.locator('[data-selected="true"]')).toHaveCount(2);
 await cells.nth(1).press("ControlOrMeta+x"); await expect(cells.nth(0)).toHaveText(/\s*/);
 await page.getByRole("button",{name:"실행 취소",exact:true}).click(); await expect(cells.nth(0)).toHaveText("Alpha");
});

test("Sheet Usage exposes the Markdown adapter public API and source history", async ({page}) => {
 await page.goto("/demo/sheet");
 await page.getByRole("tab",{name:"Markdown",exact:true}).click();
 const grid=page.getByRole("grid"); const cells=grid.getByRole("gridcell");
 await cells.nth(2).dblclick(); await grid.getByRole("textbox").fill("수정"); await grid.getByRole("textbox").press("Enter");
 await expect(cells.nth(2)).toHaveText("수정");
 await page.getByRole("button",{name:"실행 취소",exact:true}).click(); await expect(cells.nth(2)).toHaveText("강조");
 await page.getByRole("tab",{name:"Sheet",exact:true}).click(); await expect(grid.getByRole("gridcell")).toHaveCount(12);
});

test("table actions stay icon-only and editing preserves cell geometry", async ({page}) => {
 for (const path of ["/demo/sheet", "/applications/bear"]) {
  await page.goto(path);
  const grid=page.getByRole("grid"); const cell=grid.getByRole("gridcell").nth(2);
  const toolbar=page.getByRole("toolbar",{name:"표 작업"});
  await expect(toolbar.getByRole("button")).toHaveCount(6);
  for (const button of await toolbar.getByRole("button").all()) {
   await expect(button.locator("svg").first()).toBeVisible();
   expect(await button.textContent()).toBe("");
  }
  await cell.scrollIntoViewIfNeeded();
  const before=await cell.boundingBox(); const gridBefore=await grid.boundingBox();
  await cell.dblclick(); const input=grid.getByRole("textbox"); await expect(input).toBeVisible();
  expect(await cell.boundingBox()).toEqual(before); expect(await grid.boundingBox()).toEqual(gridBefore);
  await input.fill("A long draft that must not resize the table while editing this cell");
  expect(await cell.boundingBox()).toEqual(before); expect(await grid.boundingBox()).toEqual(gridBefore);
  await input.press("Escape");
  expect(await cell.boundingBox()).toEqual(before); expect(await grid.boundingBox()).toEqual(gridBefore);
 }
});

test("Sheet preserves its selected rectangle during Tab/Enter entry and Ctrl+Enter fill", async ({page}) => {
 await page.goto('/demo/sheet');const grid=page.getByRole('grid'),cells=grid.getByRole('gridcell');
 await cells.nth(0).click();await cells.nth(4).click({modifiers:['Shift']});
 await cells.nth(4).press('Tab');await expect(cells.nth(0)).toBeFocused();
 await cells.nth(0).press('Enter');await expect(cells.nth(3)).toBeFocused();
 await cells.nth(3).press('F2');let input=grid.getByRole('textbox');await input.fill('edited');await input.press('Enter');
 await expect(cells.nth(1)).toBeFocused();await expect(grid.locator('[data-selected="true"]')).toHaveCount(4);
 await cells.nth(1).press('F2');input=grid.getByRole('textbox');await input.fill('filled');await input.press('Control+Enter');
 for(const i of [0,1,3,4]) await expect(cells.nth(i)).toHaveText('filled');
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();await expect(cells.nth(3)).toHaveText('edited');await expect(cells.nth(0)).toHaveText('Alpha');
});

test("drag selection, fill handle, row/column selection and resize use document transactions", async ({page}) => {
 await page.goto('/demo/sheet');const grid=page.getByRole('grid'),cells=grid.getByRole('gridcell');
 const start=await cells.nth(0).boundingBox(),end=await cells.nth(4).boundingBox();
 await page.mouse.move(start!.x+20,start!.y+12);await page.mouse.down();await page.mouse.move(end!.x+20,end!.y+12,{steps:8});await page.mouse.up();
 await expect(grid.locator('[data-selected="true"]')).toHaveCount(4);
 await grid.getByRole('button',{name:'선택 범위 채우기'}).click();
 await expect(cells.nth(6)).toHaveText('Alpha');await expect(cells.nth(7)).toHaveText('Draft');
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();await expect(cells.nth(6)).toHaveText('Gamma');
 await grid.getByRole('button',{name:'Name 열 선택',exact:true}).click();await expect(grid.locator('[data-selected="true"]')).toHaveCount(4);
 await grid.getByRole('button',{name:'2행 선택',exact:true}).click();await expect(grid.locator('[data-selected="true"]')).toHaveCount(3);
 const before=(await cells.nth(0).boundingBox())!.width;
 await grid.getByRole('button',{name:'Name 열 너비 조절'}).press('ArrowRight');
 expect((await cells.nth(0).boundingBox())!.width).toBeGreaterThan(before);
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();
 expect((await cells.nth(0).boundingBox())!.width).toBeCloseTo(before,0);
});

test("Bear keeps inline formatting visible during cell editing and refuses unsupported layout", async ({page}) => {
 await page.goto('/applications/bear');const grid=page.getByRole('grid'),cell=grid.getByRole('gridcell').last();
 await expect(grid.getByRole('button',{name:/너비 조절|높이 조절/})).toHaveCount(0);
 await expect(cell.locator('strong')).toBeVisible();await cell.scrollIntoViewIfNeeded();const before=await cell.boundingBox();
 const weight=await cell.locator('strong').evaluate(el=>getComputedStyle(el).fontWeight);
 await cell.dblclick();const input=grid.getByRole('textbox');
 await expect(input.locator('strong')).toBeVisible();
 expect(await input.locator('strong').evaluate(el=>getComputedStyle(el).fontWeight)).toBe(weight);
 await expect(input.locator('[data-markdown-delimiter]').first()).toBeHidden();
 expect(await cell.boundingBox()).toEqual(before);await input.press('Escape');
 await expect(cell.locator('strong')).toBeVisible();expect(await cell.boundingBox()).toEqual(before);
});
