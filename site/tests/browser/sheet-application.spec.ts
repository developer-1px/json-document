import {expect,test} from "@playwright/test";

test("Sheet application edits, keeps geometry, persists title/data/size, and navigates a range",async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/applications/sheet');const grid=page.getByRole('grid',{name:'Sheet'}),cells=grid.getByRole('gridcell');
 await expect(cells).toHaveCount(480);
 const title=page.getByRole('textbox',{name:'시트 이름'});await title.fill('주간 계획');
 const cell=cells.nth(0);await cell.scrollIntoViewIfNeeded();const before=await cell.boundingBox();
 await cell.dblclick();const input=grid.getByRole('textbox');await input.fill('작업');expect(await cell.boundingBox()).toEqual(before);await input.press('Enter');
 await expect(cells.nth(12)).toBeFocused();await expect(cell).toHaveText('작업');
 await cell.click();await cells.nth(13).click({modifiers:['Shift']});await cells.nth(13).press('Tab');await expect(cell).toBeFocused();await expect(grid.locator('[data-selected="true"]')).toHaveCount(4);
 const resize=grid.getByRole('button',{name:'A 열 너비 조절'});await resize.focus();await resize.press('ArrowRight');
 await expect(page.getByRole('main').getByRole('status')).toHaveText('이 브라우저에 저장됨');await page.reload();
 await expect(page.getByRole('textbox',{name:'시트 이름'})).toHaveValue('주간 계획');await expect(cells.nth(0)).toHaveText('작업');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('json-document.sheet.v1')!));expect(saved.columns[0].width).toBeGreaterThan(120);
 await cells.nth(0).click();await page.getByRole('button',{name:'행 추가',exact:true}).click();await expect(cells).toHaveCount(492);
 await page.getByRole('button',{name:'실행 취소',exact:true}).click();await expect(cells).toHaveCount(480);
 expect(errors).toEqual([]);
});

test("invalid saved document is visible and not overwritten on mount",async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('json-document.sheet.v1','invalid'));
 await page.goto('/applications/sheet');await expect(page.getByRole('main').getByRole('status')).toContainText('읽지 못했습니다');
 expect(await page.evaluate(()=>localStorage.getItem('json-document.sheet.v1'))).toBe('invalid');
 await page.getByRole('gridcell').first().dblclick();const input=page.getByRole('grid').getByRole('textbox');await input.fill('복구');await input.press('Enter');
 await expect(page.getByRole('main').getByRole('status')).toHaveText('이 브라우저에 저장됨');
});
