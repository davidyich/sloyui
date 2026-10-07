/** Import the canonical color graph and independent Borders control. Roll back only newly created collections. */
async function importCapacitiesVariables(figma, graph) {
 const prefix='Capacities · ', existing=await figma.variables.getLocalVariableCollectionsAsync();
 if(existing.some(c=>graph.collections.some(d=>prefix+d.name===c.name)))throw new Error('Capacities collections already exist. Use migration for an existing library; nothing was changed.');
 const created=[],variables=new Map(),modeIds=new Map();
 try {
  for(const definition of graph.collections){const c=figma.variables.createVariableCollection(prefix+definition.name);created.push(c);const names=Object.keys(definition.modes);c.renameMode(c.defaultModeId,names[0]);const ids=new Map([[names[0],c.defaultModeId]]);for(const n of names.slice(1))ids.set(n,c.addMode(n));modeIds.set(definition.name,ids);for(const name of Object.keys(definition.modes[names[0]])){const key=definition.name+'/'+name,m=graph.metadata[key];const v=figma.variables.createVariable(name,c,m.type);v.scopes=m.scopes;v.description='Canonical full Capacities palette model. Theme, Semantic surface and Borders modes inherit independently.';v.setVariableCodeSyntax('WEB',`var(${m.css})`);variables.set(key,v);}}
  for(const d of graph.collections)for(const [mode,id]of modeIds.get(d.name))for(const [name,value]of Object.entries(d.modes[mode])) {const resolved=value&&value.alias?{type:'VARIABLE_ALIAS',id:variables.get(value.alias).id}:value&&value.components?{r:value.components[0],g:value.components[1],b:value.components[2],a:value.alpha}:value;variables.get(d.name+'/'+name).setValueForMode(id,resolved);}
  return {collections:created.map(c=>({id:c.id,name:c.name,modes:c.modes})),variableIds:[...variables.values()].map(v=>v.id),variableCount:variables.size,contexts:Object.keys(graph.contexts)};
 }catch(error){for(const c of created.reverse())c.remove();throw new Error(`${error.message||error} All collections created by this attempt were removed.`);}
}
