import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=process.argv[2];
if(!root) throw new Error('Usage: node scripts/apply-sheet-sibling-migration.mjs /path/to/spredsheet [--apply]');
const directory=fileURLToPath(new URL('../integrations/dogfooding-sheet/',import.meta.url));
const manifest=JSON.parse(readFileSync(resolve(directory,'migration.json'),'utf8'));
const hash=path=>createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex');
const states=manifest.files.map(file=>({path:file.path,state:hash(file.path)===file.after?'applied':hash(file.path)===file.before?'pending':'changed'}));
if(states.every(file=>file.state==='applied')) console.log(`Sibling migration verified: ${states.length} files already applied.`);
else if(!states.every(file=>file.state==='pending')) throw new Error(`Sibling baseline differs; no files changed.\n${JSON.stringify(states,null,2)}`);
else if(!process.argv.includes('--apply')) console.log(`Sibling baseline verified: ${states.length} files ready. Use --apply to apply the reviewed patch.`);
else {
 const patch=resolve(directory,'migration.patch');
 execFileSync('git',['apply','--check',patch],{cwd:root,stdio:'inherit'});
 execFileSync('git',['apply',patch],{cwd:root,stdio:'inherit'});
 if(!manifest.files.every(file=>hash(file.path)===file.after)) throw new Error('Post-apply verification failed.');
 console.log(`Sibling migration applied and verified: ${states.length} files.`);
}
