import {useEffect,useRef,useState} from 'react';
import type {Context} from './model.mjs';
import type {ComputeRequest,createPaletteComputer} from './compute.mjs';
import {createPaletteResultStore,type PaletteReply} from './palette-results.mjs';
declare const __PALETTE_WORKER__:string;
/** Keep heavy color solving away from input, layout, and first paint. */
export function usePaletteComputer(request:ComputeRequest){
 const key=JSON.stringify(request),worker=useRef<Worker|null>(null),fallback=useRef<ReturnType<typeof createPaletteComputer>|null>(null);
 const [store]=useState(createPaletteResultStore),[,setRevision]=useState(0);
 const receive=(data:PaletteReply)=>{if(store.receive(data))setRevision(value=>value+1);};
 useEffect(()=>{
  try{const url=URL.createObjectURL(new Blob([__PALETTE_WORKER__],{type:'text/javascript'}));worker.current=new Worker(url);URL.revokeObjectURL(url);}
  catch{worker.current=null;}
  return()=>{worker.current?.terminate();worker.current=null;};
 },[]);
 useEffect(()=>{
  const {id,cached}=store.start(request);let cancelled=false;
  setRevision(value=>value+1);
  if(cached)return;
  if(worker.current){
   worker.current.onmessage=event=>receive(event.data);
   worker.current.onerror=()=>receive({id,done:true,error:'Color calculation failed. Reload to retry.'});
   worker.current.postMessage({id,request:JSON.parse(key)});
  }else{
   // Offline/older browsers still paint before loading the fallback and yield between colors.
   void(async()=>{
    await new Promise(resolve=>setTimeout(resolve,32));
    const [{createPaletteComputer},{default:source},{default:resolved}]=await Promise.all([import('./compute.mjs'),import('../source.json'),import('../../token-system-v4/palette-contexts.json')]);
    const computer=fallback.current??=createPaletteComputer(source,resolved),accents=request.exportScope==='all'?[request.project.neutral.accent,...request.project.accents]:[request.accent];
    const completed=request.page==='tokens'&&request.format!=='project'?computer.completedAudit(request.project,accents):undefined,contexts:Context[]=[...(completed??[])];
    try{let slice=performance.now();for(const task of completed?[]:computer.tasks(request)){if(cancelled)return;contexts.push(computer.context(task.accent,request.project,task.theme,task.scheme,task.surface));if(performance.now()-slice>=16){receive({id,contexts:[...contexts]});await new Promise(resolve=>setTimeout(resolve,0));slice=performance.now();}}
    if(cancelled)return;receive({id,contexts,text:request.page==='tokens'?computer.export(request.project,accents,request.format,contexts):'',done:true});}
    catch(error){receive({id,done:true,error:error instanceof Error?error.message:String(error)});}
   })();
  }
  return()=>{cancelled=true;};
 },[key]);
 return store.read(request);
}
