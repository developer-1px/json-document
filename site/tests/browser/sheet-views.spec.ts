import {expect,test,type Locator} from "@playwright/test";
const cell=(grid:Locator,row:string,column:string)=>grid.locator(`[data-grid-row-id="${row}"][data-grid-column-id="${column}"]`);

test("two Views share edits and history while their ID selection and order remain independent",async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/demo/sheet-views');
 const left=page.getByRole('grid',{name:'기본 순서 표'}),right=page.getByRole('grid',{name:'다른 순서 표'});
 await expect(left.getByRole('gridcell').first()).toHaveText('Alpha');await expect(right.getByRole('gridcell').first()).toHaveText('수진');
 await cell(left,'beta','status').click();
 await cell(right,'gamma','owner').dblclick();await right.getByRole('textbox').fill('공유 편집');await right.getByRole('textbox').press('Enter');
 await expect(cell(left,'gamma','owner')).toHaveText('공유 편집');await expect(cell(left,'beta','status')).toHaveAttribute('aria-selected','true');
 const leftSection=page.getByRole('region',{name:'기본 순서 View'}),rightSection=page.getByRole('region',{name:'다른 순서 View'});
 await leftSection.getByRole('button',{name:'실행 취소',exact:true}).click();await expect(cell(right,'gamma','owner')).toHaveText('수진');
 await rightSection.getByRole('button',{name:'다시 실행',exact:true}).click();await expect(cell(left,'gamma','owner')).toHaveText('공유 편집');
 await cell(right,'gamma','owner').click();await cell(right,'gamma','owner').press('ArrowRight');await expect(cell(right,'gamma','status')).toBeFocused();
 await leftSection.getByRole('button',{name:'행 추가',exact:true}).click();await expect(left.getByRole('row')).toHaveCount(5);await expect(right.getByRole('row')).toHaveCount(5);
 await leftSection.getByRole('button',{name:'열 추가',exact:true}).click();await expect(left.getByRole('gridcell')).toHaveCount(16);await expect(right.getByRole('gridcell')).toHaveCount(16);
 await rightSection.getByRole('button',{name:'실행 취소',exact:true}).click();await expect(left.getByRole('gridcell')).toHaveCount(12);
 await rightSection.getByRole('button',{name:'실행 취소',exact:true}).click();await expect(right.getByRole('gridcell')).toHaveCount(9);
 expect(errors).toEqual([]);
});

test("copy, paste and fill follow the reordered View and update the other View",async({page})=>{
 await page.goto('/demo/sheet-views');const left=page.getByRole('grid',{name:'기본 순서 표'}),right=page.getByRole('grid',{name:'다른 순서 표'});
 await cell(right,'gamma','owner').click();await page.keyboard.down('Shift');await cell(right,'beta','status').click();await page.keyboard.up('Shift');
 await page.keyboard.press('ControlOrMeta+c');await expect.poll(()=>page.evaluate(()=>navigator.clipboard.readText())).toBe('수진\t완료\n태오\t검토');
 await cell(right,'gamma','owner').click();await page.evaluate(()=>navigator.clipboard.writeText('가\t나\n다\t라'));await page.keyboard.press('ControlOrMeta+v');
 await expect(cell(left,'gamma','owner')).toHaveText('가');await expect(cell(left,'gamma','status')).toHaveText('나');await expect(cell(left,'beta','owner')).toHaveText('다');await expect(cell(left,'beta','status')).toHaveText('라');
 await cell(right,'gamma','owner').click();await right.getByRole('button',{name:'선택 범위 채우기'}).click();await expect(cell(left,'beta','owner')).toHaveText('가');
});

test("Mac Enter opens editing and commits into the other View",async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,"platform",{get:()=>"MacIntel"}));
 await page.goto('/demo/sheet-views');
 const left=page.getByRole('grid',{name:'기본 순서 표'}),right=page.getByRole('grid',{name:'다른 순서 표'});
 await cell(left,'alpha','name').click();await cell(left,'alpha','name').press('Enter');
 await expect(left.getByRole('textbox')).toHaveValue('Alpha');
 await left.getByRole('textbox').fill('Mac Enter');await left.getByRole('textbox').press('Enter');
 await expect(left.getByRole('textbox')).toHaveCount(0);
 await expect(cell(right,'alpha','name')).toHaveText('Mac Enter');
 await expect(cell(left,'beta','name')).toBeFocused();
});
