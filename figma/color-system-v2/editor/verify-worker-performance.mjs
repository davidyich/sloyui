import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Worker} from 'node:worker_threads';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../../',import.meta.url)),out=root+'artifacts/palette-performance-20261031/',mode=process.argv[2]??'current';
const require=createRequire(new URL('../../../package.json',import.meta.url));let esbuild;try{esbuild=require('esbuild');}catch{esbuild=createRequire('/Users/davidov/AI/PROJECTS/sloyui/node_modules/esbuild/package.json')('esbuild');}
const entry=mode==='baseline'?out+'baseline/editor/compute-worker.ts':new URL('./compute-worker.ts',import.meta.url).pathname;
const {outputFiles}=await esbuild.build({entryPoints:[entry],bundle:true,write:false,format:'iife',target:'es2022',minify:true});
await fs.mkdir(out,{recursive:true});
let fixture;try{fixture=JSON.parse(await fs.readFile(out+'fixture.json'));}catch{
 const model=await import('./model.mjs');
 fixture={schema:model.schema,accents:model.presets.map(p=>({...model.createAccent(p.name,p.hex),id:p.name})),neutral:model.createNeutralSystem(),rules:{...model.defaultRules,balanceSecondary:true},backgrounds:{Light:'#F1EEF8',Dark:'#221D2C'}};
 fixture.accents[0]=model.setPaletteStep(fixture.accents[0],'ramp',20,'#7854E8');
 await fs.writeFile(out+'fixture.json',JSON.stringify(fixture,null,2));
}
const request={project:fixture,accent:fixture.accents[0],page:'overview',isDetail:false,theme:'Light',scheme:'Standard',surface:'Content',exportScope:'all',format:'tokens',paletteView:'ramps'};
function createWorker(){return new Worker(`const{parentPort}=require('node:worker_threads');let cloneMs=0;global.self={postMessage:data=>{const start=performance.now();parentPort.postMessage(data);cloneMs+=performance.now()-start;if(data.done){parentPort.postMessage({telemetryFor:data.id,cloneMs});cloneMs=0;}}};${outputFiles[0].text}\nparentPort.on('message',data=>self.onmessage({data}));`,{eval:true});}
const hash=value=>createHash('sha256').update(value).digest('hex');
function run(worker,id,req){return new Promise((resolve,reject)=>{
 const start=performance.now();let contexts=[],text='',messages=0,bytes=0,finalMs=0;
 const timeout=setTimeout(()=>reject(new Error('Worker timed out: '+req.page)),120000);
 const onError=error=>{clearTimeout(timeout);reject(error);};
 const listener=data=>{
  if(data.telemetryFor===id){clearTimeout(timeout);worker.off('message',listener);worker.off('error',onError);resolve({totalMs:Math.round(finalMs),messages,transferredJsonBytes:bytes,workerCloneMs:Number(data.cloneMs.toFixed(2)),contexts:contexts.length,contextHash:hash(JSON.stringify(contexts)),textHash:hash(text)});return;}
  if(data.id!==id)return;
  messages++;bytes+=Buffer.byteLength(JSON.stringify(data));
  if(data.error){clearTimeout(timeout);reject(new Error(data.error));return;}
  if(data.append)contexts.push(...data.append);else if(data.contexts)contexts=data.contexts;
  if(data.done){finalMs=performance.now()-start;text=data.text??'';}
 };
 worker.on('message',listener);worker.once('error',onError);worker.postMessage({id,request:req});
});}
const report={mode,checkedAt:new Date().toISOString(),fixtureHash:hash(JSON.stringify(fixture)),scenarios:{}};
for(const [name,patch]of [['palettes',{page:'palettes'}],['overview',{}],['specimen',{page:'specimens',isDetail:true}],['export',{page:'tokens'}]]){
 const worker=createWorker(),req={...request,...patch};
 report.scenarios[name]={cold:await run(worker,1,req),warm:await run(worker,2,structuredClone(req))};await worker.terminate();console.log(name,JSON.stringify(report.scenarios[name]));
}
if(mode!=='baseline'){
 let old;try{old=JSON.parse(await fs.readFile(out+'baseline-worker-report.json'));}catch{}
 report.exactBaselineComparison=!!old;
 if(old){
  assert.equal(report.fixtureHash,old.fixtureHash);
  for(const name of ['overview','specimen','export'])for(const run of ['cold','warm']){
   assert.equal(report.scenarios[name][run].contextHash,old.scenarios[name][run].contextHash,name+': exact contexts including diagnostics/order');
   assert.equal(report.scenarios[name][run].textHash,old.scenarios[name][run].textHash,name+': exact export');
  }
 }
 assert.equal(report.scenarios.palettes.cold.contexts,0);
 assert.equal(report.scenarios.export.cold.contexts,(fixture.accents.length+1)*28);
 const worker=createWorker(),received=[];
 await new Promise((resolve,reject)=>{
  let cancelled=false;const timeout=setTimeout(()=>reject(new Error('Cancellation timed out')),20000);
  worker.on('message',data=>{received.push(data);if(data.id===10&&!data.done&&!cancelled){cancelled=true;for(let id=11;id<=20;id++)worker.postMessage({id,request:{...request,page:'specimens',isDetail:true,accent:{...request.accent,softChroma:1.4+id/100}}});worker.postMessage({id:21,request:{...request,page:'palettes'}});}
  if(data.id===21&&data.done){clearTimeout(timeout);resolve();}});worker.once('error',reject);worker.postMessage({id:10,request:{...request,page:'tokens'}});
 });
 await new Promise(resolve=>setTimeout(resolve,50));await worker.terminate();
 assert.ok(!received.some(x=>x.id>=10&&x.id<=20&&x.done),'Obsolete calculations must not produce final results');
 assert.equal(received.filter(x=>x.id>=11&&x.id<=20).length,0,'Queued edits must coalesce before starting obsolete work');
 report.cancelledRequests=[10,11,12,13,14,15,16,17,18,19,20];report.finalRequest=21;
}
await fs.writeFile(out+(mode==='baseline'?'baseline':'current')+'-worker-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({report:out+(mode==='baseline'?'baseline':'current')+'-worker-report.json'}));
