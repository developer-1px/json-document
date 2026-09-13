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
 await cells.nth(1).press("Enter");
 const input=grid.getByRole("textbox"); await input.fill("Changed"); await input.press("Escape");
 await expect(cells.nth(1)).toHaveText("Draft");
 await cells.nth(1).press("Enter"); await input.fill("Changed"); await input.press("Tab");
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
