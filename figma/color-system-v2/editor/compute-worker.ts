import source from '../source.json';
import resolved from '../../token-system-v4/palette-contexts.json';
import {createPaletteComputer,type ComputeRequest} from './compute.mjs';
import type {Context} from './model.mjs';
const computer=createPaletteComputer(source,resolved),yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
let latest=0,running=false,queued:{id:number;request:ComputeRequest}|null=null;
/** Coalesce queued pointer edits before starting another expensive context. */
self.onmessage=({data})=>{latest=data.id;queued=data;if(!running){running=true;setTimeout(()=>void drain(),0);}};
async function drain(){
 while(queued){
  const {id,request}=queued;queued=null;
  const accents=request.exportScope==='all'?[request.project.neutral.accent,...request.project.accents]:[request.accent];
  const completed=request.page==='tokens'&&request.format!=='project'?computer.completedAudit(request.project,accents):undefined;
  const audit:Context[]|undefined=request.page==='tokens'?[...(completed??[])]:undefined;
  try{
   let chunk:Context[]=[],slice=performance.now();
   if(completed)self.postMessage({id,append:completed,done:false});
   for(const task of completed?[]:computer.tasks(request)){
    if(id!==latest)break;
    const calculated=computer.context(task.accent,request.project,task.theme,task.scheme,task.surface);
    chunk.push(calculated);audit?.push(calculated);
    if(performance.now()-slice>=16){
     self.postMessage({id,append:chunk,done:false});chunk=[];
     await yieldTask();slice=performance.now();
    }
   }
   if(id!==latest)continue;
   if(chunk.length)self.postMessage({id,append:chunk,done:false});
   // Consume pending navigation before final graph assembly/serialization.
   await yieldTask();if(id!==latest)continue;
   const text=request.page==='tokens'?computer.export(request.project,accents,request.format,audit):'';
   self.postMessage({id,text,done:true});
  }catch(error){if(id===latest)self.postMessage({id,error:error instanceof Error?error.message:String(error),done:true});}
  finally{if(audit)audit.length=0;}
 }
 running=false;
}
