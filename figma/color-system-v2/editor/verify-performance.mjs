import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import {createRequire} from 'node:module';
import {createAccent,createNeutralSystem,defaultRules,presets,schema,generatePalette,generateContext,projectAlphaRecipes,surfaces,setPaletteStep} from './model.mjs';
import {createPaletteComputer} from './compute.mjs';
const source=JSON.parse(await fs.readFile(new URL('../source.json',import.meta.url))),resolved=JSON.parse(await fs.readFile(new URL('../../token-system-v4/palette-contexts.json',import.meta.url)));
const initial=()=>({schema,accents:presets.map(p=>createAccent(p.name,p.hex)),neutral:createNeutralSystem(),rules:{...defaultRules,balanceSecondary:true},backgrounds:{Light:'#F1EEF8',Dark:'#221D2C'}});
const eagerCold=await import('./model.mjs?performance-cold-eager'),lazyCold=await import('./model.mjs?performance-cold-lazy'),benchmarkProject=initial();
const startupTimings={eager:[],lazy:[]};
for(const [mode,model] of [['eager',eagerCold],['lazy',lazyCold]])for(const a of [benchmarkProject.neutral.accent,...benchmarkProject.accents]){
 const start=performance.now(),palette=model.generatePalette(a,benchmarkProject.rules);
 // This full-family call is the exact former synchronous generateContext path.
 if(mode==='eager')model.projectAlphaRecipes(a,source,resolved,benchmarkProject.backgrounds,benchmarkProject.rules,palette,benchmarkProject.neutral);
 model.generateContext(a,'Light','Standard','Content',source,resolved,benchmarkProject.backgrounds,benchmarkProject.rules,palette,'Content',benchmarkProject.neutral);
 startupTimings[mode].push({accent:a.name,ms:Math.round(performance.now()-start)});
}
const startupTotals=Object.fromEntries(Object.entries(startupTimings).map(([mode,times])=>[mode,times.reduce((total,value)=>total+value.ms,0)]));
const project=initial(),accent=setPaletteStep(project.accents[0],'ramp',20,'#7854E8');
project.accents[0]=accent;
const snapshot=JSON.stringify(project),computer=createPaletteComputer(source,resolved);
const request={project,accent,page:'overview',isDetail:false,theme:'Light',scheme:'Standard',surface:'Content',exportScope:'all',format:'tokens',paletteView:'ramps'};
assert.equal(computer.tasks(request).length,8);
assert.equal(computer.tasks({...request,isDetail:true,page:'specimens'}).length,1);
assert.equal(computer.tasks({...request,isDetail:true,page:'edits'}).length,0);
assert.equal(computer.tasks({...request,page:'tokens',exportScope:'all'}).length,224);
const first=computer.context(accent,project,'Light','Standard','Content');
const cached=performance.now();assert.strictEqual(first,computer.context(accent,{...project,accents:[...project.accents]},'Light','Standard','Content'));const cacheMs=performance.now()-cached;
assert.notStrictEqual(first,computer.context({...accent,softChroma:accent.softChroma+.01},project,'Light','Standard','Content'));
assert.notStrictEqual(first,computer.context(accent,{...project,backgrounds:{...project.backgrounds,Light:'#D9CEE7'}},'Light','Standard','Content'));
assert.equal(JSON.stringify(project),snapshot,'Computation must not mutate saved projects or authored anchors');
// The eager reference computes every family first; lazy selection must preserve exact paints and diagnostics.
const eager=await import('./model.mjs?performance-eager');
const eagerPalette=eager.generatePalette(accent,project.rules);
eager.projectAlphaRecipes(accent,source,resolved,project.backgrounds,project.rules,eagerPalette,project.neutral);
for(const theme of source.themes)for(const scheme of source.schemes)for(const surface of surfaces){
 const actual=generateContext(accent,theme,scheme,surface,source,resolved,project.backgrounds,project.rules,generatePalette(accent,project.rules),surface,project.neutral);
 const expected=eager.generateContext(accent,theme,scheme,surface,source,resolved,project.backgrounds,project.rules,eagerPalette,surface,project.neutral);
 assert.deepEqual(actual,expected,`${theme}/${scheme}/${surface}: lazy family changed output`);
}
const workerModule=new URL('./compute.mjs',import.meta.url).href;
const worker=new Worker(`const {parentPort}=require('node:worker_threads');(async()=>{const {createPaletteComputer}=await import(${JSON.stringify(workerModule)});parentPort.on('message',({source,resolved,request})=>{const c=createPaletteComputer(source,resolved),start=performance.now();for(const task of c.tasks(request))c.context(task.accent,request.project,task.theme,task.scheme,task.surface);parentPort.postMessage({elapsedMs:Math.round(performance.now()-start)});});})();`,{eval:true});
let ticks=0,maxGap=0,last=performance.now();const timer=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-last);last=now;ticks++;},10);
const workerResult=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.postMessage({source,resolved,request:{...request,project:initial()}});});
clearInterval(timer);await worker.terminate();assert.ok(ticks>10,'Main thread must stay responsive during cold solving');assert.ok(maxGap<250,`Main thread blocked for ${maxGap}ms`);
// Exercise the actual bundled browser-worker protocol, including navigation cancellation.
const require=createRequire(new URL('../../../package.json',import.meta.url));
let esbuild;try{esbuild=require('esbuild');}catch{esbuild=createRequire('/Users/davidov/AI/PROJECTS/sloyui/node_modules/esbuild/package.json')('esbuild');}
const bundle=await esbuild.build({entryPoints:[new URL('./compute-worker.ts',import.meta.url).pathname],bundle:true,write:false,format:'iife',target:'es2022'});
const protocol=new Worker(`const {parentPort}=require('node:worker_threads');global.self={postMessage:data=>parentPort.postMessage(data)};${bundle.outputFiles[0].text}\nparentPort.on('message',data=>self.onmessage({data}));`,{eval:true});
const messages=[];
await new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(new Error('Worker cancellation timed out')),20000);
 protocol.on('error',reject);
 protocol.on('message',data=>{
  messages.push(data);
  if(data.id===1&&!data.done&&messages.filter(x=>x.id===1).length===1)protocol.postMessage({id:2,request:{...request,page:'edits',isDetail:true}});
  if(data.id===2&&data.done){clearTimeout(timeout);resolve();}
 });
 protocol.postMessage({id:1,request});
});
await new Promise(resolve=>setTimeout(resolve,100));await protocol.terminate();
assert.ok(!messages.some(x=>x.id===1&&x.done),'Cancelled navigation must not publish a stale final result');
assert.equal(messages.at(-1).id,2);assert.deepEqual(messages.at(-1).contexts,[]);
const report={checkedAt:new Date().toISOString(),startupTimings,startupTotals,exactContextComparisons:28,authoredAnchor:'#7854E8',cacheHitMs:Number(cacheMs.toFixed(3)),workerResult,mainThreadTicks:ticks,maxMainThreadTimerGapMs:Math.round(maxGap),cancelledWorkerRequest:1,finalWorkerRequest:messages.at(-1).id};
await fs.mkdir(new URL('../../../artifacts/palette-performance-20261030/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../../../artifacts/palette-performance-20261030/focused-report.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
