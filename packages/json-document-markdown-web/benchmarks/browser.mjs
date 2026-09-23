import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus, totalmem, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

// Production browser fixture: source projection, native binding and retained editor History.
// Optional --baseline <git-ref> compares these four source owners using the same dependency tree.
const wt = fileURLToPath(new URL('../../../', import.meta.url));
const { values: options } = parseArgs({ options: { baseline: { type: 'string' }, out: { type: 'string' }, sizes: { type: 'string' } } });
const out = options.out ? resolve(options.out) : await fs.mkdtemp(resolve(tmpdir(), 'markdown-performance-'));
await fs.mkdir(out, { recursive: true });
const sizes = (options.sizes ?? '1000,10000,50000,100000').split(',').map(Number);
if (sizes.some(size => ![1000,10000,50000,100000].includes(size))) throw new Error('Unsupported fixture size');
const packages = ['editing', 'markdown', 'contenteditable', 'markdown-web'];
const git = (...args) => execFileSync('git', args, { cwd: wt, encoding: 'utf8' }).trim();
const baseline = options.baseline ? git('rev-parse', options.baseline + '^{commit}') : null;
const versions = baseline ? ['before', 'current'] : ['current'];
if (baseline) {
  await fs.mkdir(resolve(out, 'before'), { recursive: true });
  const archive = execFileSync('git', ['archive', baseline, ...packages.map(name => 'packages/json-document-' + name + '/src')], { cwd: wt });
  execFileSync('tar', ['-x', '-C', resolve(out, 'before')], { input: archive });
}
console.log('Artifacts: ' + out);
const fixture = (size, kind = 'mixed') => {
  const unit = kind === 'plain' ? 'Markdown 원문과 한글 입력을 확인합니다. 선택과 기록을 보존하고 다음 문장을 작성합니다.\n' :
    'Markdown 원문을 **그대로 보존**합니다. 한글 입력과 __방향 있는 선택__을 확인합니다. 문서를 읽고 수정합니다.\n';
  return unit.repeat(Math.ceil(size / unit.length)).slice(0, size);
};
const stats = values => {
  const sorted = [...values].sort((a,b) => a-b);
  return { n: sorted.length, median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * .95)-1], max: sorted.at(-1) };
};

for (const version of versions) {
  const root = version === 'before' ? `${out}/before` : wt;
  await build({
    stdin: { contents: `import { createJSONDocument } from '@interactive-os/json-document';
import { createTextEditor } from '@interactive-os/json-document-editing';
import { createContentEditableBinding, plainTextDOMAdapter } from '@interactive-os/json-document-contenteditable';
import { createMarkdownDOMAdapter } from '@interactive-os/json-document-markdown-web';
import { projectMarkdown } from '@interactive-os/json-document-markdown';
window.lib = {createJSONDocument,createTextEditor,createContentEditableBinding,plainTextDOMAdapter,createMarkdownDOMAdapter,projectMarkdown};`, resolveDir: wt },
    alias: {
      '@interactive-os/json-document-editing': `${root}/packages/json-document-editing/src/index.ts`,
      '@interactive-os/json-document-markdown': `${root}/packages/json-document-markdown/src/index.ts`,
      '@interactive-os/json-document-contenteditable': `${root}/packages/json-document-contenteditable/src/index.ts`,
      '@interactive-os/json-document-markdown-web': `${root}/packages/json-document-markdown-web/src/index.ts`,
    },
    nodePaths: [`${wt}/node_modules`], bundle: true, minify: true, platform: 'browser', format: 'iife',
    define: { 'process.env.NODE_ENV': '"production"' }, outfile: `${out}/${version}.js`,
  });
}

const browser = await chromium.launch({ channel: 'chrome' });
const results = { date: new Date().toISOString(), browser: browser.version(), cpu: cpus()[0].model, memory: totalmem(), head: git('rev-parse', 'HEAD'), dirty: git('status', '--porcelain') !== '', baseline, bundles: {}, micro: [], native: [], history: [] };
for (const version of versions) results.bundles[version] = createHash('sha256').update(await fs.readFile(resolve(out, version + '.js'))).digest('hex');
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const client = await page.context().newCDPSession(page);
async function load(version) {
  await page.goto('about:blank');
  await page.setContent('<div id="root" contenteditable="true" style="white-space:pre-wrap;overflow-wrap:anywhere;width:768px;font:16px/24px sans-serif;min-height:100px"></div>');
  await page.addScriptTag({ path: `${out}/${version}.js` });
}

for (const [size, kind] of [[1000,'mixed'],[10000,'mixed'],[50000,'mixed'],[100000,'mixed'],[100000,'plain']].filter(([size]) => sizes.includes(size))) {
  for (const version of [...versions].reverse()) {
    await load(version);
    const result = await page.evaluate(({source}) => {
      const {lib} = window, root = document.getElementById('root');
      const stat = values => { const a=values.sort((a,b)=>a-b);return { n:a.length,median:a[Math.floor(a.length/2)],p95:a[Math.ceil(a.length*.95)-1],max:a.at(-1) }; };
      const measure = (fn, n=30) => {for(let i=0;i<5;i++)fn(i);const values=[];for(let i=0;i<n;i++){const t=performance.now();fn(i);values.push(performance.now()-t);}return stat(values);};
      const spans = lib.projectMarkdown(source).strong.length;
      const parse = measure(()=>lib.projectMarkdown(source).strong);
      const dom = lib.createMarkdownDOMAdapter();
      const render = measure(i=>{const text=source+(i%2?'x':'y');dom.render(root,text,{anchor:text.length,focus:text.length});dom.restoreSelection(root,{anchor:text.length,focus:text.length});root.getBoundingClientRect();});
      dom.render(root,source);root.focus();
      const caret = measure(i=>{const offset=source.length-10-(i%2);dom.render(root,source,{anchor:offset,focus:offset});dom.restoreSelection(root,{anchor:offset,focus:offset});root.getBoundingClientRect();});
      const observe = measure(()=>dom.observe(root));
      const editor = lib.createTextEditor(lib.createJSONDocument(source));editor.select({anchor:source.length,focus:source.length});
      const command = measure(()=>editor.insert('x'),100);
      return {spans,nodes:root.querySelectorAll('*').length,parse,render,caret,observe,command};
    }, { source: fixture(size,kind) });
    results.micro.push({ version,size,kind,...result });
    console.log(JSON.stringify({phase:'micro',version,size,kind,...result}));
    await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
  }
}

for (const size of sizes) {
  for (const version of versions) {
    console.log(JSON.stringify({phase:'native-start', version, size}));
    await load(version);
    await page.evaluate(({source})=>{
      const root=document.getElementById('root'), {lib}=window;
      const editor=lib.createTextEditor(lib.createJSONDocument(source));
      const dom=lib.createMarkdownDOMAdapter();
      window.measurements=[];window.calls={};window.editor=editor;
      const wrapped={};
      for(const key of ['render','observe','restoreSelection'])wrapped[key]=(...args)=>{const t=performance.now();try{return dom[key](...args);}finally{const c=window.calls[key]??={count:0,ms:0};c.count++;c.ms+=performance.now()-t;}};
      let started=0, eventType='';
      for(const type of ['beforeinput','compositionend'])root.addEventListener(type,e=>{started=performance.now();eventType=type;},true);
      const binding=lib.createContentEditableBinding({document:editor.document,pointer:'',editor,root,dom:wrapped});
      window.dispose=binding.bind();
      const finish = e => {root.getBoundingClientRect();window.measurements.push({type:eventType,inputType:e.inputType,ms:performance.now()-started});};
      root.addEventListener('beforeinput',e=>{if(e.defaultPrevented)finish(e);});
      root.addEventListener('input',finish);
      root.addEventListener('compositionend',finish);
      root.focus();editor.select({anchor:source.length,focus:source.length});
    }, {source:fixture(size)});
    await page.waitForTimeout(30);
    for (const mode of ['typing','composition','ime-enter']) {
      await page.evaluate(()=>{window.measurements=[];window.calls={};});
      for(let i=0;i<35;i++) {
        if(mode==='typing')await page.keyboard.type('x');
        else {
          await client.send('Input.imeSetComposition',{text:'ㅎ',selectionStart:1,selectionEnd:1});
          await client.send('Input.imeSetComposition',{text:'한글',selectionStart:2,selectionEnd:2});
          if(mode==='ime-enter')await client.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:229});
          await client.send('Input.insertText',{text:'한글'});
          if(mode==='ime-enter')await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
        }
        await page.evaluate(() => new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Input frame did not complete within 5 seconds')), 5000);
          requestAnimationFrame(() => { clearTimeout(timeout); document.body.getBoundingClientRect(); resolve(); });
        }));
        await page.waitForTimeout(5);
      }
      const raw=await page.evaluate(()=>({measurements:window.measurements,calls:window.calls,length:window.editor.text.length}));
      const samples=raw.measurements.filter(x=>mode==='typing'?x.inputType==='insertText':x.type==='compositionend').slice(5);
      const expectedLength = size + ({ typing: 35, composition: 105, 'ime-enter': 210 })[mode];
      if (samples.length !== 30 || raw.length !== expectedLength) throw new Error('Native input was lost or duplicated');
      const row={version,size,mode,...stats(samples.map(x=>x.ms)),calls:raw.calls,length:raw.length};
      results.native.push(row);console.log(JSON.stringify({phase:'native',...row}));
      await fs.writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
    }
  }
}
await page.close();
for (const version of versions) {
  for (const size of [10000,50000]) {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ path: resolve(out, version + '.js') });
    const client = await page.context().newCDPSession(page);
    const heap = async () => { await client.send('HeapProfiler.collectGarbage'); return client.send('Runtime.getHeapUsage'); };
    const initialHeap = await heap();
    await page.evaluate(size => { window.editor = window.lib.createTextEditor(window.lib.createJSONDocument('한'.repeat(size))); window.revision = 0; }, size);
    const initial = await heap();
    for (const edits of [100,500]) {
      await page.evaluate(edits => {
        while (window.revision < edits) {
          window.revision++;
          const source = '한'.repeat(window.editor.text.length - String(window.revision).length) + window.revision;
          const flat = new TextDecoder().decode(new TextEncoder().encode(source));
          window.editor.replace(flat, { anchor: 1, focus: 1 });
        }
      }, edits);
      results.history.push({ version, size, edits, initialHeap, initial, retained: await heap() });
    }
    const undoCount = await page.evaluate(() => { let count=0; while (window.editor.undo().ok) count++; return count; });
    const restored = await page.evaluate(size => window.editor.text === '한'.repeat(size), size);
    if (undoCount !== 500 || !restored) throw new Error('History lost original source or undo entries');
    await page.evaluate(() => { delete window.editor; });
    results.history.push({ version, size, undoCount, released: await heap(), initialHeap });
    await page.close();
  }
}
await fs.writeFile(resolve(out, 'results.json'), JSON.stringify(results, null, 2));
await browser.close();
