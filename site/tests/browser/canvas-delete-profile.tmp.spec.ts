import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('profile saved document delete through paint and persistence', async ({page})=>{
 const checkpoint=readFileSync('/tmp/canvas-undo-checkpoint.json','utf8');
 await page.addInitScript(value=>localStorage.setItem('json-document.canvas.v1',value),checkpoint);
 await page.goto('/applications/canvas');
 const items=page.locator('[data-canvas-object]');await expect(items.first()).toBeVisible();
 await page.evaluate(()=>{
   (window as any).deletionTimings=[];
   document.addEventListener('keydown',e=>{
    if(e.key!=='Delete')return;const start=performance.now();
    requestAnimationFrame(()=>requestAnimationFrame(()=>(window as any).deletionTimings.push(performance.now()-start)));
   },true);
 });
 for(let i=0;i<3;i++){
  const item=items.last();await item.click({force:true});
  const count=await items.count();await page.locator('[data-canvas-slide]').press('Delete');await expect(items).toHaveCount(count-1);
 }
 await expect.poll(()=>page.evaluate(()=>(window as any).deletionTimings.length)).toBe(3);
 console.log('DELETE_INPUT_TO_PAINT',await page.evaluate(()=>(window as any).deletionTimings));
});
