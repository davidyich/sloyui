import {generatePalette,generateContext,generateAll,exportGraph,exportCSS,makeFigmaCode,surfaces} from './model.mjs';

/** A worker-local bounded cache survives navigation and ignores unrelated UI preferences. */
export function createPaletteComputer(source,resolved) {
 const cache=new Map();
 const remember=(key,create)=>{if(cache.has(key))return cache.get(key);const value=create();if(cache.size>=512)cache.delete(cache.keys().next().value);cache.set(key,value);return value;};
 return {
  context(accent,project,theme,scheme,surface){
   const key=JSON.stringify([accent,project.backgrounds,project.rules,project.neutral,theme,scheme,surface]);
   return remember(key,()=>generateContext(accent,theme,scheme,surface,source,resolved,project.backgrounds,project.rules,generatePalette(accent,project.rules),surface,project.neutral));
  },
  export(project,accents,format){
   if(format==='project')return JSON.stringify(project,null,2);
   if(format==='css')return exportCSS(accents,source,resolved,project.backgrounds,project.rules,project.neutral);
   const graph=exportGraph(accents,source,resolved,project.backgrounds,project.rules,project.neutral);
   return format==='figma'?makeFigmaCode(graph):JSON.stringify(graph,null,2);
  },
  tasks(request){
   const {project,page,isDetail,accent,theme,scheme,surface,exportScope,format}=request;
   if(page==='edits'||page==='surfaces'||page==='tokens'&&format==='project')return [];
   const accents=isDetail&&!(page==='tokens'&&exportScope==='all')?[accent]:[project.neutral.accent,...project.accents];
   const targets=page==='tokens'?surfaces:page==='matrix'||page==='palettes'?surfaces:[surface];
   return accents.flatMap(a=>(page==='tokens'?source.themes:[theme]).flatMap(t=>(page==='tokens'?source.schemes:[scheme]).flatMap(s=>targets.map(target=>({accent:a,theme:t,scheme:s,surface:target})))));
  }
 };
}
