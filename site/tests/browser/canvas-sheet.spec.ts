import {expect,test} from "@playwright/test";

test("Canvas creates and edits a shared Sheet object with parent history and JSON persistence",async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/demo/canvas');await page.getByRole('button',{name:'표',exact:true}).click();
 const surface=page.locator('[data-canvas-slide]');const box=await surface.boundingBox();
 await page.mouse.click(box!.x+box!.width*.12,box!.y+box!.height*.18);
 const object=page.locator('[data-canvas-object]');await expect(object).toHaveCount(1);await surface.focus();await surface.press("F2");
 const grid=page.getByRole('grid',{name:'Canvas 표'});await expect(grid).toBeVisible();
 const cells=grid.getByRole('gridcell');await cells.first().click();await page.keyboard.type('abc');await page.keyboard.press('Enter');await expect(cells.first()).toHaveText('abc');
 await cells.nth(3).press('Escape');await expect(surface).toBeFocused();
 const toolbar=page.getByRole('toolbar',{name:'Canvas tools'});await toolbar.getByRole('button',{name:'실행 취소',exact:true}).click();
 await object.dblclick();await expect(grid.getByRole('gridcell').first()).not.toHaveText('abc');
 await grid.getByRole('gridcell').first().press('Escape');await toolbar.getByRole('button',{name:'다시 실행',exact:true}).click();
 await object.dblclick();await expect(cells.first()).toHaveText('abc');
 await grid.getByRole('button',{name:'A 열 너비 조절'}).press('ArrowRight');
 await cells.first().press('Escape');await toolbar.getByRole('button',{name:'JSON',exact:true}).click();
 const json=page.getByRole('textbox',{name:'Canvas JSON document'}),saved=JSON.parse(await json.inputValue());
 expect(saved.objects[0].document.rows[0].cells.c0).toBe('abc');expect(saved.objects[0].document.columns[0].width).toBeGreaterThan(120);
 await page.getByRole('button',{name:'JSON 열기',exact:true}).click();await object.dblclick();await expect(cells.first()).toHaveText('abc');
 expect(errors).toEqual([]);
});

test("replacement typing, external paste, header focus and scaled resize share the same Sheet owner",async({page})=>{
 await page.goto('/applications/sheet');const grid=page.getByRole('grid'),cells=grid.getByRole('gridcell');
 await cells.first().click();await page.keyboard.type('abc');await page.keyboard.press('Enter');await expect(cells.first()).toHaveText('abc');
 await cells.first().click();await page.evaluate(()=>navigator.clipboard.writeText('a\tb\nc\td'));await page.keyboard.press('ControlOrMeta+v');
 for(const [index,value] of [[0,'a'],[1,'b'],[12,'c'],[13,'d']] as const)await expect(cells.nth(index)).toHaveText(value);
 await grid.getByRole('button',{name:'A 열 선택',exact:true}).click();await page.keyboard.press('ArrowRight');await expect(cells.nth(469)).toBeFocused();
 await page.locator('[data-sheet-hand]').evaluate((element:HTMLElement)=>{element.style.transform='scale(0.5)';element.style.transformOrigin='top left';});
 await grid.getByRole('button',{name:'A 열 너비 조절'}).press('ArrowRight');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('json-document.sheet.v1')!).columns[0].width)).toBe(130);
 await page.goto('/applications/bear');const bearCell=page.getByRole('gridcell').nth(2);await bearCell.click();await page.keyboard.type('abc');await page.keyboard.press('Enter');await expect(bearCell).toHaveText('abc');
});

test("table preview survives horizontal, vertical and tiny creation drags",async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 for(const [dx,dy] of [[90,0],[0,90],[1,1]]) {
  await page.goto('/demo/canvas');await page.getByRole('button',{name:'표',exact:true}).click();
  const surface=page.locator('[data-canvas-slide]'),box=await surface.boundingBox();
  const x=box!.x+box!.width*.15,y=box!.y+box!.height*.2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx!,y+dy!,{steps:4});
  await expect(surface).toBeVisible();await page.mouse.up();
  const object=page.locator('[data-canvas-object]');await expect(object).toHaveCount(1);
  expect(Number(await object.getAttribute('width'))).toBeGreaterThan(0);expect(Number(await object.getAttribute('height'))).toBeGreaterThan(0);
  await page.getByRole('toolbar',{name:'Canvas tools'}).getByRole('button',{name:'실행 취소',exact:true}).click();await expect(object).toHaveCount(0);
 }
 expect(errors).toEqual([]);
});
