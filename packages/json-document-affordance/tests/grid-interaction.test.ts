import {expect,test} from 'vitest';
import {extendGridFill,storedResizeValue,resizeValueForKey,collapseResizeValue,cellEditingAffordance} from '../src/index.js';

test('fill extends on one dominant axis, including upward and leftward extension',()=>{
 const source={rMin:2,rMax:3,cMin:2,cMax:3},bounds={rowCount:10,columnCount:8};
 expect(extendGridFill(source,{row:0,column:2},bounds)).toEqual({...source,rMin:0});
 expect(extendGridFill(source,{row:2,column:0},bounds)).toEqual({...source,cMin:0});
 expect(extendGridFill(source,{row:5,column:5},bounds)).toEqual({...source,rMax:5});
 expect(extendGridFill(source,{row:99,column:2},bounds)).toEqual({...source,rMax:9});
 expect(extendGridFill(source,{row:2,column:2},bounds)).toBe(source);
});
test('axis limits and keyboard movement retain the sibling contract',()=>{
 const bounds={min:40,max:400};
 expect(storedResizeValue(99.6,bounds)).toBe(100);
 expect(storedResizeValue(Infinity,bounds)).toBe(40);
 expect(resizeValueForKey(100,'ArrowRight',true,'x',bounds)).toBe(150);
 expect(resizeValueForKey(100,'ArrowDown',false,'x',bounds)).toBeNull();
 expect(collapseResizeValue(40,180,bounds,100)).toEqual({value:180,previous:null});
});
test('spreadsheet range fill and entry are explicit policy, document Enter keeps activation',()=>{
 const stroke={key:'Enter',metaKey:false,ctrlKey:false,shiftKey:false};
 expect(cellEditingAffordance(stroke,{editing:false,allSelected:false,enter:'move'}).hand).toMatchObject({type:'move',direction:'down'});
 expect(cellEditingAffordance(stroke,{editing:false,allSelected:false,enter:'edit'}).hand).toMatchObject({type:'rename',action:'begin'});
 expect(cellEditingAffordance({...stroke,ctrlKey:true},{editing:true,allSelected:false,enter:'move'}).hand).toMatchObject({action:'commit',target:'selection'});
 expect(cellEditingAffordance({...stroke,ctrlKey:true},{editing:true,allSelected:false,enter:'edit'}).hand).toBeNull();
});
