/** Shared geometry modes, upstream of semantic and component contracts. */
export function attachDensity({source, primitives, semantic, components, metadata, legacyPaths, legacy, cssName}) {
  const modes=Object.fromEntries(Object.keys(source.modes).map(mode=>[mode,{}]));
  const aliases={};
  const roles=Object.keys(source.modes[source.defaultMode]);
  let css='\n/* Density selects geometry; raw dimensions remain immutable. */\n:root {\n';
  for(const [mode,values] of Object.entries(source.modes)) {
    if(Object.keys(values).join('|')!==roles.join('|'))throw new Error(`Density roles differ in ${mode}`);
    for(const [role,value] of Object.entries(values)) {
      if(!Number.isInteger(value)||value<0)throw new Error(`Invalid density length ${mode}/${role}`);
      const name=`dimension/${value}`;
      if(!(name in primitives)) {
        primitives[name]=value;
        metadata[`Primitives/${name}`]={type:'FLOAT',unit:'px',visibility:'internal',scopes:[],css:cssName('primitive/'+name)};
        css+=`  ${cssName('primitive/'+name)}:${value}px;\n`;
      }
      modes[mode][role]={alias:`Primitives/${name}`};
    }
  }
  css+='}\n';
  for(const role of roles) {
    const scopes=[role.startsWith('space/')?'GAP':'WIDTH_HEIGHT'];
    const densityCSS=cssName('density/'+role), semanticCSS=cssName(role);
    metadata['Density/'+role]={type:'FLOAT',unit:'px',visibility:'internal',scopes,css:densityCSS,description:'Shared geometry selected by Default/Compact, independent of color and radius.'};
    for(const values of Object.values(semantic))values[role]={alias:'Density/'+role};
    metadata['Semantic/'+role]={...metadata['Density/'+role],css:semanticCSS};
    aliases[semanticCSS]=densityCSS;
  }
  for(const [oldPath,role] of Object.entries(source.legacyBindings)) {
    if(!metadata['Density/'+role])throw new Error(`Missing density binding ${oldPath}: ${role}`);
    const path=legacyPaths[oldPath];
    if(!path)throw new Error(`Unknown legacy geometry ${oldPath}`);
    const [collection,...parts]=path.split('/'),name=parts.join('/');
    if(collection==='Components'){
      components[name]={alias:'Density/'+role};
      aliases[cssName('component/'+name)]=cssName('density/'+role);
      metadata[path].css=cssName('component/'+name);
    }
    else if(collection==='Semantic')for(const values of Object.values(semantic))values[name]={alias:'Density/'+role};
    const originalCSS=legacy.metadata[oldPath]?.css;
    if(originalCSS)aliases[originalCSS]=cssName('density/'+role);
    if(metadata[path]?.css)aliases[metadata[path].css]=cssName('density/'+role);
    for(const [oldName,target] of Object.entries(legacy.legacyNames))if('Primitives/'+target===oldPath)aliases['--cap-'+oldName]=cssName('density/'+role);
  }
  for(const [name,role] of Object.entries(source.componentBindings)) {
    if(!metadata['Density/'+role])throw new Error(`Missing component geometry ${name}: ${role}`);
    components[name]={alias:'Density/'+role};
    const nameCSS=cssName('component/'+name);
    metadata['Components/'+name]={...metadata['Density/'+role],css:nameCSS,scopes:[]};
    aliases[nameCSS]=cssName('density/'+role);
  }
  for(const [mode,values] of Object.entries(modes)) {
    const key=mode.toLowerCase();
    css+=`${mode===source.defaultMode?':root:not([data-density]), ':''}[data-density="${key}"] {\n`;
    for(const [role,value] of Object.entries(values))css+=`  ${cssName('density/'+role)}:var(${metadata[value.alias].css});\n`;
    css+='}\n';
  }
  css+=':root, [data-density] {\n';
  for(const [name,target] of Object.entries(aliases))css+=`  ${name}:var(${target});\n`;
  css+='}\n';
  return {collection:{name:'Density',modes},css,aliases};
}
