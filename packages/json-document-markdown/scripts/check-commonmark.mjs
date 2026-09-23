import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createMarkdownParser} from '../dist/index.js';
import {fromMarkdown} from 'mdast-util-from-markdown';
// Supply CommonMark 0.31.2 spec.json; compare each update with an independent full AST walk.
if (!process.argv[2]) throw new Error('Usage: node scripts/check-commonmark.mjs <spec.json>');
const examples=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const oracle=source=>{const strong=[];const visit=n=>{if(n.type==='strong'){const from=n.position.start.offset,to=n.position.end.offset;strong.push({from,to,contentFrom:from+2,contentTo:to-2});}n.children?.forEach(visit);};visit(fromMarkdown(source));return {source,strong};};
let checks=0,seed=763;const next=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const inserts=['x','한글','한글\n','\n','\r\n','**','__','`','[a]','\n[a]: /url','<script>','- ','','😀','&amp;','\\',' '];
for(const {example,markdown} of examples){
 const parser=createMarkdownParser(markdown);let source=markdown;assert.deepEqual(parser.projection,oracle(source));checks++;
 for(let n=0;n<60;n++){
  const from=n%4===0?source.length:next(source.length+1),to=Math.min(source.length,from+next(4)),insert=inserts[next(inserts.length)];
  const before=source;source=source.slice(0,from)+insert+source.slice(to);
  const actual=parser.update(from,to,insert).projection;
  try{assert.deepEqual(actual,oracle(source));}catch(error){console.error(JSON.stringify({example,n,before,from,to,insert,source,actual,expected:oracle(source)}));throw error;}checks++;
  if(n%3===0){assert.deepEqual(parser.update(from,from+insert.length,before.slice(from,to)).projection,oracle(before));source=before;checks++;}
 }
}
console.log(JSON.stringify({examples:examples.length,checks,seed,result:'pass'}));
