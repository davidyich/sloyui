import source from '../source.json';
import resolved from '../../token-system-v4/palette-contexts.json';
import {createPaletteComputer} from './compute.mjs';
const computer=createPaletteComputer(source,resolved);
let latest=0;
self.onmessage=async({data})=>{
 const {id,request}=data;latest=id;
 try {
  const contexts=[];
  for(const task of computer.tasks(request)){
   if(id!==latest)return;
   contexts.push(computer.context(task.accent,request.project,task.theme,task.scheme,task.surface));
   self.postMessage({id,contexts,done:false});
   // Accept a newer request between expensive contexts; stale work never overwrites the view.
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(id!==latest)return;
  const accents=request.exportScope==='all'?[request.project.neutral.accent,...request.project.accents]:[request.accent];
  const text=request.page==='tokens'?computer.export(request.project,accents,request.format):'';
  self.postMessage({id,contexts,text,done:true});
 }catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error),done:true});}
};
