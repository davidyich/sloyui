import {generatePalette,generateContext,exportGraph,exportCSS,makeFigmaCode,surfaces} from './model.mjs';

/** All caches are semantic: structured-cloned requests retain the same calculation identity. */
export function createPaletteComputer(source,resolved) {
 const cache=new Map(),ramps=new Map(),exports=new Map(),graphs=new Map();
 let lastAudit=null;
 const scopeKey=(project,accents)=>JSON.stringify([accents,project.backgrounds,project.rules,project.neutral]);
 const completedAudit=(project,accents)=>{const key=scopeKey(project,accents);if(lastAudit?.key!==key)lastAudit=null;return lastAudit?.contexts;};
 const remember=(storage,key,create,limit)=>{if(storage.has(key))return storage.get(key);const value=create();if(storage.size>=limit)storage.delete(storage.keys().next().value);storage.set(key,value);return value;};
 const palette=(accent,rules)=>remember(ramps,JSON.stringify([accent,rules.vividness]),()=>generatePalette(accent,rules),256);
 const context=(accent,project,theme,scheme,surface)=>{
  const key=JSON.stringify([accent,project.backgrounds,project.rules,project.neutral,theme,scheme,surface]);
  return remember(cache,key,()=>generateContext(accent,theme,scheme,surface,source,resolved,project.backgrounds,project.rules,palette(accent,project.rules),surface,project.neutral),512);
 };
 return {
  context,
  completedAudit,
  export(project,accents,format,auditedContexts){
   if(format==='project')return JSON.stringify(project,null,2);
   const key=scopeKey(project,accents);
   const text=remember(exports,key+'/'+format,()=>{
    // A request may exceed the persistent 512-context cache. Its completed audit
    // remains authoritative until serialization finishes, then this map is released.
    const scope=auditedContexts?new Map(auditedContexts.map(c=>[`${c.accent}/${c.theme}/${c.scheme}/${c.surface}`,c])):null;
    const resolve=(accent,theme,scheme,surface)=>{
     if(!scope)return context(accent,project,theme,scheme,surface);
     const found=scope.get(`${accent.name}/${theme}/${scheme}/${surface}`);
     if(!found)throw new Error('Incomplete export audit: '+[accent.name,theme,scheme,surface].join('/'));
     return found;
    };
    try{
     if(format==='css')return exportCSS(accents,source,resolved,project.backgrounds,project.rules,project.neutral,resolve);
     const graph=remember(graphs,key,()=>exportGraph(accents,source,resolved,project.backgrounds,project.rules,project.neutral,resolve),2);
     return format==='figma'?makeFigmaCode(graph):JSON.stringify(graph,null,2);
    }finally{scope?.clear();}
   },4);
   // One bounded completed scope supports warm exports above the general cache
   // limit without retaining arbitrary projects or truncating diagnostic objects.
   if(auditedContexts?.length&&auditedContexts.length<=1024)lastAudit={key,contexts:Object.freeze([...auditedContexts])};
   else if(auditedContexts)lastAudit=null;
   return text;
  },
  tasks(request){
   const {project,page,isDetail,accent,theme,scheme,surface,exportScope,format}=request;
   // The global palette page paints mathematical ramps directly and has no semantic specimens.
   if(page==='edits'||page==='surfaces'||page==='palettes'&&!isDetail||page==='tokens'&&format==='project')return [];
   const accents=isDetail&&!(page==='tokens'&&exportScope==='all')?[accent]:[project.neutral.accent,...project.accents];
   const targets=page==='tokens'?surfaces:page==='matrix'||page==='palettes'?surfaces:[surface];
   return accents.flatMap(a=>(page==='tokens'?source.themes:[theme]).flatMap(t=>(page==='tokens'?source.schemes:[scheme]).flatMap(s=>targets.map(target=>({accent:a,theme:t,scheme:s,surface:target})))));
  }
 };
}
