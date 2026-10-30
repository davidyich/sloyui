import {useEffect,useRef,useState} from 'react';
import type {Context} from './model.mjs';
import type {ComputeRequest} from './compute.mjs';
declare const __PALETTE_WORKER__:string;
type Result={key:string;contexts:Context[];text:string;pending:boolean;error:string;elapsedMs:number};
/** Keep heavy color solving away from input, layout, and first paint. */
export function usePaletteComputer(request:ComputeRequest){
 const key=JSON.stringify(request),worker=useRef<Worker|null>(null),sequence=useRef(0);
 const [result,setResult]=useState<Result>({key:'',contexts:[],text:'',pending:true,error:'',elapsedMs:0});
 useEffect(()=>{
  try{const url=URL.createObjectURL(new Blob([__PALETTE_WORKER__],{type:'text/javascript'}));worker.current=new Worker(url);URL.revokeObjectURL(url);}
  catch{worker.current=null;}
  return()=>{worker.current?.terminate();worker.current=null;};
 },[]);
 useEffect(()=>{
  const id=++sequence.current,started=performance.now();let cancelled=false;
  setResult({key,contexts:[],text:'',pending:true,error:'',elapsedMs:0});
  const receive=(data:{id:number;contexts?:Context[];text?:string;done?:boolean;error?:string})=>{
   if(cancelled||data.id!==id)return;
   setResult({key,contexts:data.contexts??[],text:data.text??'',pending:!data.done,error:data.error??'',elapsedMs:Math.round(performance.now()-started)});
  };
  if(worker.current){
   worker.current.onmessage=event=>receive(event.data);
   worker.current.onerror=()=>receive({id,done:true,error:'Color calculation failed. Reload to retry.'});
   worker.current.postMessage({id,request:JSON.parse(key)});
  }else{
   // Offline/older browsers still paint before loading the fallback and yield between colors.
   void(async()=>{
    await new Promise(resolve=>setTimeout(resolve,32));
    const [{createPaletteComputer},{default:source},{default:resolved}]=await Promise.all([import('./compute.mjs'),import('../source.json'),import('../../token-system-v4/palette-contexts.json')]);
    const computer=createPaletteComputer(source,resolved),contexts:Context[]=[];
    try{for(const task of computer.tasks(request)){if(cancelled)return;contexts.push(computer.context(task.accent,request.project,task.theme,task.scheme,task.surface));receive({id,contexts:[...contexts]});await new Promise(resolve=>setTimeout(resolve,0));}
    if(cancelled)return;const accents=request.exportScope==='all'?[request.project.neutral.accent,...request.project.accents]:[request.accent];receive({id,contexts,text:request.page==='tokens'?computer.export(request.project,accents,request.format):'',done:true});}
    catch(error){receive({id,done:true,error:error instanceof Error?error.message:String(error)});}
   })();
  }
  return()=>{cancelled=true;};
 },[key]);
 return result.key===key?result:{key,contexts:[],text:'',pending:true,error:'',elapsedMs:0};
}
