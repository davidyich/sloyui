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
assert.equal(computer.tasks({...request,page:'palettes'}).length,0,'Global ramps do not need semantic contexts');
assert.equal(computer.tasks({...request,page:'tokens',format:'project'}).length,0,'Authored project export does not need a color audit');
assert.equal(computer.tasks({...request,page:'palettes',isDetail:true}).length,7,'Detailed role hints keep all surface contexts');
assert.equal(computer.tasks({...request,page:'tokens',exportScope:'all'}).length,224);
const first=computer.context(accent,project,'Light','Standard','Content');
const cached=performance.now();assert.strictEqual(first,computer.context(accent,{...project,accents:[...project.accents]},'Light','Standard','Content'));const cacheMs=performance.now()-cached;
assert.strictEqual(first,computer.context(structuredClone(accent),structuredClone(project),'Light','Standard','Content'),'Structured clone must preserve semantic cache identity');
assert.notStrictEqual(first,computer.context({...accent,softChroma:accent.softChroma+.01},project,'Light','Standard','Content'));
assert.notStrictEqual(first,computer.context(accent,{...project,backgrounds:{...project.backgrounds,Light:'#D9CEE7'}},'Light','Standard','Content'));
assert.notStrictEqual(first,computer.context(accent,{...project,rules:{...project.rules,minimumContrast:7}},'Light','Standard','Content'));
assert.notStrictEqual(first,computer.context(accent,{...project,neutral:{...project.neutral,settings:{...project.neutral.settings,bases:{...project.neutral.settings.bases,Light:.1}}}},'Light','Standard','Content'));
assert.notStrictEqual(first,computer.context(setPaletteStep(accent,'ramp',22,'#123456'),project,'Light','Standard','Content'));
assert.equal(JSON.stringify(project),snapshot,'Computation must not mutate saved projects or authored anchors');
// A 21-color export exceeds the persistent cache. Instrument solving rather than
// spending another full cold solve on the same numeric fixtures.
const scopeProject={...project,accents:Array.from({length:20},(_,index)=>({...accent,id:'scope'+index,name:'scope'+index}))};
const stubModel=`export const surfaces=${JSON.stringify(surfaces)};export let solves=0;export const generatePalette=()=>[];export function generateContext(a,t,s,surface){solves++;return{accent:a.name,theme:t,scheme:s,surface};}export function exportGraph(accents,source,resolved,bg,rules,neutral,resolve){return accents.flatMap(a=>source.themes.flatMap(t=>source.schemes.flatMap(s=>surfaces.map(surface=>resolve(a,t,s,surface)))));}export const exportCSS=(...args)=>JSON.stringify(exportGraph(...args));export const makeFigmaCode=graph=>JSON.stringify(graph);`;
const stubUrl='data:text/javascript,'+encodeURIComponent(stubModel);
const computeSource=(await fs.readFile(new URL('./compute.mjs',import.meta.url),'utf8')).replace("'./model.mjs'",JSON.stringify(stubUrl));
const {createPaletteComputer:scopeFactory}=await import('data:text/javascript,'+encodeURIComponent(computeSource)),scopeCounter=await import(stubUrl),scopeComputer=scopeFactory(source,resolved);
const scopeTasks=scopeComputer.tasks({...request,project:scopeProject,page:'tokens'}),scopeAudit=scopeTasks.map(task=>scopeComputer.context(task.accent,scopeProject,task.theme,task.scheme,task.surface));
assert.equal(scopeAudit.length,588);assert.equal(scopeCounter.solves,588);
const scopeAccents=[scopeProject.neutral.accent,...scopeProject.accents];
scopeComputer.export(scopeProject,scopeAccents,'tokens',scopeAudit);
scopeComputer.export(scopeProject,scopeAccents,'css',scopeAudit);
assert.equal(scopeCounter.solves,588,'JSON and CSS assembly must reuse all 588 completed contexts, including evicted entries');
scopeAudit.length=0;
const warmScope=scopeComputer.completedAudit(scopeProject,scopeAccents);
assert.equal(warmScope.length,588,'One completed scope retains full exact contexts above the general cache limit');
assert.equal(warmScope[0].accent,'neutral');
scopeComputer.export(scopeProject,scopeAccents,'tokens',warmScope);
assert.equal(scopeCounter.solves,588,'Warm export must skip solving its completed 588-context audit');
const latestScopeTask=scopeTasks.at(-1);scopeComputer.context(latestScopeTask.accent,scopeProject,latestScopeTask.theme,latestScopeTask.scheme,latestScopeTask.surface);
assert.equal(scopeCounter.solves,588);
const oldestScopeTask=scopeTasks[0];scopeComputer.context(oldestScopeTask.accent,scopeProject,oldestScopeTask.theme,oldestScopeTask.scheme,oldestScopeTask.surface);
assert.equal(scopeCounter.solves,589,'Temporary export retention must not enlarge the persistent 512-context cache');
assert.equal(scopeComputer.completedAudit({...scopeProject,rules:{...scopeProject.rules,minimumContrast:7}},scopeAccents),undefined,'Changed semantic inputs invalidate the completed scope');
const overBudgetProject={...scopeProject,accents:Array.from({length:37},(_,index)=>({...accent,id:'budget'+index,name:'budget'+index}))},overBudgetAccents=[overBudgetProject.neutral.accent,...overBudgetProject.accents];
const overBudgetTasks=scopeComputer.tasks({...request,project:overBudgetProject,page:'tokens'}),overBudgetAudit=overBudgetTasks.map(task=>scopeComputer.context(task.accent,overBudgetProject,task.theme,task.scheme,task.surface));
assert.equal(overBudgetAudit.length,1064);
scopeComputer.export(overBudgetProject,overBudgetAccents,'tokens',overBudgetAudit);
assert.equal(scopeComputer.completedAudit(overBudgetProject,overBudgetAccents),undefined,'Completed scopes above 1024 contexts remain request-local');
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
assert.equal(messages.at(-1).id,2);assert.equal(messages.at(-1).append?.length??0,0);
// Exercise cold/warm scope retention through the actual worker scheduler too.
const scopeBundle=await esbuild.build({entryPoints:[new URL('./compute-worker.ts',import.meta.url).pathname],bundle:true,write:false,format:'iife',target:'es2022',plugins:[{name:'instrument-scope-solving',setup(build){build.onLoad({filter:/[/\\]model\.mjs$/},()=>({contents:stubModel.replace('solves++;','solves++;globalThis.__scopeSolves=solves;'),loader:'js'}));}}]});
const scopeWorker=new Worker(`const {parentPort}=require('node:worker_threads');global.self={postMessage:data=>parentPort.postMessage({...data,solves:globalThis.__scopeSolves})};${scopeBundle.outputFiles[0].text}\nparentPort.on('message',data=>self.onmessage({data}));`,{eval:true});
const runScope=id=>new Promise((resolve,reject)=>{
 const contexts=[],timeout=setTimeout(()=>reject(new Error('Large-scope worker timed out')),10000);
 const receive=data=>{if(data.id!==id)return;if(data.error){clearTimeout(timeout);reject(new Error(data.error));return;}if(data.append)contexts.push(...data.append);if(data.done){clearTimeout(timeout);scopeWorker.off('message',receive);resolve({contexts,solves:data.solves,text:data.text});}};
 scopeWorker.on('message',receive);scopeWorker.once('error',reject);scopeWorker.postMessage({id,request:{...request,project:scopeProject,page:'tokens'}});
});
const coldScope=await runScope(1),warmScopeResult=await runScope(2);await scopeWorker.terminate();
assert.equal(coldScope.contexts.length,588);assert.equal(coldScope.solves,588);assert.equal(warmScopeResult.solves,588,'Warm actual-worker scope must solve zero additional contexts');
assert.deepEqual(warmScopeResult.contexts,coldScope.contexts);assert.equal(warmScopeResult.text,coldScope.text);
const report={checkedAt:new Date().toISOString(),startupTimings,startupTotals,exactContextComparisons:28,authoredAnchor:'#7854E8',cacheHitMs:Number(cacheMs.toFixed(3)),workerResult,mainThreadTicks:ticks,maxMainThreadTimerGapMs:Math.round(maxGap),cancelledWorkerRequest:1,finalWorkerRequest:messages.at(-1).id,largeExportScope:{contexts:588,coldSolves:coldScope.solves,warmSolves:warmScopeResult.solves,retainedLimit:1024,overBudgetContexts:1064}};
await fs.mkdir(new URL('../../../artifacts/palette-performance-20261030/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../../../artifacts/palette-performance-20261030/focused-report.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
