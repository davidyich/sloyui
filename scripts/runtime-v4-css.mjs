import { runtimeV4Graph, runtimeV4GraphHash, v4Variables, v4CSSName, legacyColorPath, surfaceCompatibility, resolveV4 } from './runtime-v4-model.mjs';

const attributes={Theme:'theme',Surface:'surface',SurfaceScheme:'surface-scheme',Density:'density',Radius:'radius',Borders:'borders'};
const gate=(axis,mode)=>`--cap-v4-route-${axis.toLowerCase()}-${mode.toLowerCase()}`;
const boundary=':root, [data-theme], [data-surface], [data-surface-scheme], [data-density], [data-radius], [data-borders], [data-accent], [data-color], [data-shadow]';
const cap=name=>'--cap-'+name.replaceAll('/','-');
const colorCSS=value=>`rgb(${[value.r,value.g,value.b].map(channel=>+(channel*255).toFixed(10)).join(' ')}${value.a===1?'':` / ${value.a}`})`;
const valueCSS=(value,token)=>value?.alias?`var(${v4CSSName(value.alias)})`:value?.color?`rgb(var(${v4CSSName(value.color.alias)}-rgb) / calc(var(${v4CSSName(value.opacity.alias)}) / 100))`:token.type==='COLOR'?colorCSS(value):token.type==='STRING'?JSON.stringify(value):value+(token.unit==='number'?'':'px');

/** Mode gates are independent inherited inputs. Rebind the alias graph at
 * every context boundary because CSS inherits already-computed values. */
export function attachRuntimeV4(architecture, legacy) {
 const aliases={};
 const mappedDeclarations=new Set();
 for(const [legacyPath,metadata]of Object.entries(legacy.metadata)) {
  if(!legacyPath.startsWith('Semantic/'))continue;
  const oldName=legacyPath.slice(9),path=legacyColorPath(oldName);
  if(!path)continue;
  for(const name of [metadata.css,architecture.graph.metadata[architecture.graph.legacyPaths[legacyPath]]?.css])if(name) {
   aliases[name]=v4CSSName(path);
   mappedDeclarations.add(name);
  }
 }
 // The neutral action CSS has an established dedicated public spelling.
 for(const state of ['normal','hover','pressed'])aliases['--cap-action-'+state]=v4CSSName('Theme/surface/primary/neutral-'+state);
 aliases['--cap-action-text']=v4CSSName('Theme/content/on-primary');
 for(const [path]of v4Variables)if(/^Palette\/(?:[^/]+\/\d+|black|white)$/.test(path))aliases[cap('palette/'+path.slice(8))]=v4CSSName(path);
 aliases['--cap-surface-current']=v4CSSName('Theme/surface/bg');
 aliases['--cap-surface-background']=v4CSSName('Theme/surface/bg');
 aliases['--cap-surface-block']=v4CSSName('Theme/surface/block');
 aliases['--cap-content-inverted']=v4CSSName('Theme/content/inverted');
 aliases['--cap-surface-bg']=v4CSSName('Theme/surface/bg');
 aliases['--cap-component-card-background']=v4CSSName('Theme/surface/block');
 aliases['--cap-decoration-width']=v4CSSName('Borders/border/width');
 aliases['--cap-border-width']=v4CSSName('Primitives/stroke/structural');
 aliases['--cap-divider-width']=v4CSSName('Primitives/stroke/structural');
 aliases['--cap-focus-width']=v4CSSName('Primitives/stroke/focus');
 aliases['--cap-touch-target']=v4CSSName('Density/fixed/size/touch');
 for(const [old,role]of Object.entries({sans:'base',serif:'heading',mono:'pair',code:'code',heading:'heading',pair:'pair'}))aliases['--cap-font-'+old]=v4CSSName('Primitives/font/family/'+role);
 for(const size of ['xs','sm','md','lg','xl'])aliases['--cap-padding-'+size]=v4CSSName('Density/adaptive/padding/'+size);
 for(const size of ['sm','md','lg','xl'])aliases['--cap-gap-inline-'+size]=v4CSSName('Density/adaptive/gap/inline-'+size);
 for(const size of ['sm','md','lg','xl'])aliases['--cap-gap-stack-'+size]=v4CSSName('Density/adaptive/gap/stack-'+size);
 aliases['--cap-gap-inline-xs']=v4CSSName('Density/fixed/gap/inline-xs');
 for(const space of [0,2,4,8,12,16,24,32,48,64])aliases['--cap-fixed-space-'+space]=v4CSSName('Density/fixed/space/'+space);
 for(const size of ['sm','md','lg'])aliases['--cap-icon-size-'+size]=v4CSSName('Density/fixed/size/icon-'+size);
 for(const token of runtimeV4Graph.collections.find(collection=>collection.key==='Theme').variables.filter(token=>token.name.startsWith('stable/')||token.name.startsWith('adaptive/alpha/')))aliases[cap(token.name)]=v4CSSName('Theme/'+token.name);
 aliases['--cap-font-base']=v4CSSName('Primitives/font/family/base');
 for(const [tone,hue]of Object.entries({danger:'red',success:'green',warning:'orange',info:'blue'}))aliases[`--cap-status-${tone}-border`]=v4CSSName('Theme/border/'+hue+'-normal');
 for(const size of ['sm','md','lg','xl']) {
  aliases['--cap-control-height-'+size]=v4CSSName('Density/adaptive/control/height-'+size);
  aliases['--cap-size-control-'+size]=v4CSSName('Density/adaptive/control/height-'+size);
  aliases['--cap-el-h-'+(size==='md'?'base':size)]=v4CSSName('Density/adaptive/control/height-'+size);
  aliases['--cap-el-w-'+(size==='md'?'base':size)]=v4CSSName('Density/adaptive/control/height-'+size);
  for(const component of ['button','input','select'])aliases[`--cap-component-${component}-height-${size}`]=v4CSSName('Density/adaptive/control/height-'+size);
  for(const component of ['button','input'])aliases[`--cap-component-${component}-inset-inline-${size}`]=v4CSSName('Density/adaptive/control/padding-x-'+size);
 }
 for(const size of ['sm','md','lg','xl'])aliases['--cap-radius-'+size]=v4CSSName('Radius/radius/'+size);
 Object.assign(aliases,{'--cap-radius-base':v4CSSName('Radius/radius/base'),'--cap-radius-small':v4CSSName('Radius/radius/sm'),'--cap-radius-full':v4CSSName('Primitives/radius/pill'),'--cap-radius-none':v4CSSName('Primitives/radius/none')});
 const fontSizes={xs:'caption',sm:'label',base:'body',xl:'subtitle','4xl':'display'};
 for(const [old,role]of Object.entries(fontSizes))for(const group of ['size','line-height'])aliases[`--cap-font-${group}-${old}`]=v4CSSName('Primitives/font/'+group+'/'+role);
 aliases['--cap-font-size-3xl']=v4CSSName('Primitives/font/size/title');
 aliases['--cap-line-height-3xl']=v4CSSName('Primitives/font/line-height/title');
 // Established line-height spellings omit "font".
 for(const [old,role]of Object.entries(fontSizes))aliases['--cap-line-height-'+old]=v4CSSName('Primitives/font/line-height/'+role);
 for(const [old,role]of Object.entries({normal:'regular',medium:'medium',semibold:'semibold'}))aliases['--cap-font-weight-'+old]=v4CSSName('Primitives/font/weight/'+role);
 const theme=runtimeV4Graph.collections.find(collection=>collection.key==='Theme');
 let css='\n/* Runtime v4: authoritative Figma graph, SHA-256 '+runtimeV4GraphHash+'. */\n';
 // Raw entries are declared once. Every public color has the graph's exact
 // opaque Palette value; secondary fills never use alpha approximations.
 css+=':root {\n';
 for(const collection of runtimeV4Graph.collections.filter(collection=>collection.modes.length===1))for(const token of collection.variables)css+=`  ${v4CSSName(collection.key+'/'+token.name)}: ${valueCSS(token.values[collection.modes[0]],token)};\n`;
 for(const token of runtimeV4Graph.collections.find(collection=>collection.key==='Palette').variables){const value=token.values.Value;css+=`  ${v4CSSName('Palette/'+token.name)}-rgb: ${[value.r,value.g,value.b].map(channel=>+(channel*255).toFixed(10)).join(' ')};\n`;}
 css+='}\n';
 for(const [axis,config]of Object.entries(runtimeV4Graph.axes))for(const mode of config.values) {
  const modes=axis==='Surface'?Object.entries(surfaceCompatibility).filter(([,target])=>target===mode).map(([name])=>name):[mode.toLowerCase()];
  css+=[...(mode===config.default?[`:root:not([data-${attributes[axis]}])`]:[]),...modes.map(name=>`[data-${attributes[axis]}="${name}"]`)].join(', ')+' { '+config.values.map(candidate=>`${gate(axis,candidate)}:${candidate===mode?'initial':' '};`).join(' ')+' }\n';
 }
 css+=boundary+' {\n';
 for(const collection of runtimeV4Graph.collections.filter(collection=>collection.modes.length>1))for(const token of collection.variables) {
  const values=collection.modes.map(mode=>valueCSS(token.values[mode],token));
  const expression=new Set(values).size===1?values[0]:collection.modes.map((mode,index)=>`var(${gate(collection.key,mode)}, ${values[index]})`).join(' ');
  css+=`  ${v4CSSName(collection.key+'/'+token.name)}: ${expression};\n`;
 }
 for(const [name,target]of Object.entries(aliases))css+=`  ${name}:var(${target});\n`;
 css+='}\n';
 // Accent selection has its own inherited gates; selected roles must be
 // rebound when either the accent or any independent context changes.
 const hues=['neutral',...runtimeV4Graph.conventions.accents,...Object.keys(runtimeV4Graph.conventions.legacyAccentAliases)];
 for(const hue of hues) {
  const selectors=hue==='neutral'?':root:not([data-accent]):not([data-color]), [data-accent="neutral"], [data-color="neutral"], [data-accent="gray"], [data-color="gray"]':`[data-accent="${hue}"], [data-color="${hue}"]`;
  css+=selectors+' { '+hues.map(candidate=>`--cap-v4-accent-${candidate}:${candidate===hue?'initial':' '};`).join(' ')+' }\n';
 }
 css+=boundary+' {\n';
 const selected=role=>hues.map(hue=>`var(--cap-v4-accent-${hue}, var(${v4CSSName(role(runtimeV4Graph.conventions.legacyAccentAliases[hue]??hue))}))`).join(' ');
 for(const [family,prefix]of Object.entries({secondary:'accent',primary:'accent-solid'})) {
  for(const state of ['normal','hover','pressed'])css+=`  --cap-${prefix}-${state}:${selected(hue=>'Theme/surface/'+family+'/'+hue+'-'+state)};\n`;
  css+=`  --cap-${prefix}-text:${family==='secondary'?selected(hue=>'Theme/content/'+hue):selected(hue=>'Theme/content/'+(hue==='neutral'?'on-primary':'on-primary/'+hue))};\n`;
 }
 for(const state of ['normal','hover','pressed'])css+=`  --cap-accent-border${state==='normal'?'':'-'+state}:${selected(hue=>'Theme/border/'+hue+'-'+state)};\n`;
 css+='  --cap-accent-text-secondary:'+selected(hue=>hue==='neutral'?'Theme/content/secondary':'Theme/content/secondary/'+hue)+';\n';
 for(const state of ['normal','hover','pressed'])css+=`  --cap-accent-tertiary-${state}:${selected(hue=>hue==='neutral'?'Theme/surface/secondary/neutral-'+state:'Theme/surface/tertiary/'+hue+'-'+state)};\n`;
 css+='  --cap-accent-disabled:var('+v4CSSName('Theme/surface/disabled')+');\n  --cap-accent-disabled-text:var('+v4CSSName('Theme/content/disabled')+');\n';
 for(const state of ['normal','hover','pressed','text'])css+=`  --cap-accent-vivid-${state}:var(--cap-accent-solid-${state});\n`;
 css+='  --cap-accent-swatch:'+selected(hue=>hue==='neutral'?'Theme/stable/neutral/gray-500':'Theme/stable/accent/'+hue)+';\n';
 // Aliases are rebound last: inherited values otherwise freeze the parent's
 // resolved accent/surface. Do not point either direction back into itself.
 for(const [name,target]of Object.entries({ 'accent-bg':'accent-normal','accent-soft':'accent-normal','accent-block':'accent-hover','accent-ink':'accent-text','accent-solid':'accent-solid-normal','accent-on-solid':'accent-solid-text', 'control-bg':'control-normal','control-active':'control-pressed','text-primary':'content-primary','text-secondary':'content-secondary','text-muted':'content-muted','text-subtle':'content-muted','input-placeholder':'content-muted','bg-text-selection':'accent-pressed','component-tag-content':'accent-text','component-button-accent-secondary-content':'accent-text'}))css+=`  --cap-${name}:var(--cap-${target});\n`;
 for(const state of ['normal','hover','pressed'])for(const family of ['tag','button-accent-secondary'])css+=`  --cap-component-${family}-background-${state}:var(--cap-accent-${state});\n`;
 for(const [name,role]of Object.entries({'panel-border':'border-panel','overlay-border':'border-overlay','control-border':'border-control','control-border-hover':'border-control-hover','control-border-pressed':'border-control-pressed','control-border-strong':'border-strong','accent-outline':'accent-border','accent-outline-hover':'accent-border-hover','accent-outline-pressed':'accent-border-pressed'}))css+=`  --cap-${name}:color-mix(in srgb, var(--cap-${role}) var(--cap-outline-opacity), transparent);\n`;
 for(const tone of ['danger','success','warning','info'])for(const [old,role]of Object.entries({bg:'normal',hover:'hover',pressed:'pressed',text:'text'}))css+=`  --cap-status-${tone}-${old}:var(--cap-feedback-${tone}-${role});\n`;
 for(const [tone,hue]of Object.entries({danger:'red',success:'green',warning:'orange',info:'blue'}))css+=`  --cap-status-${tone}-border:var(${v4CSSName('Theme/border/'+hue+'-normal')});\n`;
 css+='}\n';
 // Absolute helpers resolve the selected scheme for both themes and all regions.
 for(const [legacySurface,surface]of Object.entries({base:'Shell',canvas:'Workspace',raised:'Content',floating:'Overlay'})) {
  css+=boundary+' {\n';
  const branch=themeName=>runtimeV4Graph.axes.SurfaceScheme.values.map(scheme=>`var(${gate('SurfaceScheme',scheme)}, ${colorCSS(resolveV4('Theme/surface/bg',{Theme:themeName,Surface:surface,SurfaceScheme:scheme}))})`).join(' ');
  css+=`  --cap-surface-${legacySurface}:var(${gate('Theme','Light')}, ${branch('Light')}) var(${gate('Theme','Dark')}, ${branch('Dark')});\n}\n`;
 }
 // Extension roles (dividers/reactions/effects) use existing compatibility
 // routing. New surface spellings set those routing gates too.
 for(const [name,surface]of Object.entries(surfaceCompatibility)) {
  const legacySurface={Shell:'base',Workspace:'canvas',Content:'raised',Overlay:'floating',Invert:'raised',Glass:'raised'}[surface];
  css+=`${name==='base'?':root:not([data-surface]), ':''}[data-surface="${name}"] { `+['base','canvas','raised','floating'].map(candidate=>`--cap-route-${candidate}:${candidate===legacySurface?'initial':' '};`).join(' ')+' }\n';
 }
 const publicRoles=theme.variables.filter(token=>!token.hiddenFromPublishing).map(token=>({name:token.name,css:v4CSSName('Theme/'+token.name),group:token.name.split('/')[0],description:token.description,scopes:token.scopes}));
 architecture.graph.runtimeSource={schemaVersion:4,source:'figma/token-system-v4/graph.json',sourceHash:runtimeV4Graph.sourceHash,graphHash:runtimeV4GraphHash,kind:'resolved-legacy-compatibility-graph',canonicalExport:'runtime-v4.json'};
 architecture.graph.note='Legacy compatibility export generated from the v4 Figma graph. Semantic/Components are compatibility names only; canonical collections and public roles are in runtime-v4.json.';
 const contract={...architecture.tokenContract,schemaVersion:4,source:'figma/token-system-v4/source.json',graph:'figma/token-system-v4/graph.json',sourceHash:runtimeV4Graph.sourceHash,graphHash:runtimeV4GraphHash,canonicalExport:'runtime-v4.json',publicColorCount:publicRoles.length,publicColors:publicRoles,surfaces:surfaceCompatibility,
  contexts:{...architecture.tokenContract.contexts,surface:['shell','workspace','content','overlay','invert','glass'],surfaceAliases:surfaceCompatibility},
  density:{...architecture.tokenContract.density,source:'figma/token-system-v4/source.json',formula:'round(k × u), u = 4 / 3; control = fixed line-height + 2 × adaptive vertical inset',preservesTypography:true,preservesIcons:true,touchTarget:44,controlMd:{Default:32,Compact:30}},
  secondary:{...architecture.tokenContract.secondary,semanticPattern:'Theme/surface/secondary/{accent}-{state}',contentPattern:'Theme/content/{accent}',borderPattern:'Theme/border/{accent}-{state}'},
  migration:{legacyPaths:architecture.graph.legacyPaths,surfaceAliases:surfaceCompatibility,cssAliases:aliases,compatibilityExport:'figma-modes.json',writesExistingFigmaDocument:false,rawComputedColors:'Palette in the canonical v4 graph; resolved literals in legacy export only'},
 };
 // Drop the old direct semantic declarations. The remaining CSS is geometry,
 // effects and compatibility aliases; final color binding comes from v4.
 for(const name of Object.keys(aliases))mappedDeclarations.add(name);
 for(const name of ['--cap-surface-base','--cap-surface-canvas','--cap-surface-raised','--cap-surface-floating'])mappedDeclarations.add(name);
 for(const declaration of css.matchAll(/(--cap-[\w-]+)\s*:/g))if(!declaration[1].startsWith('--cap-v4-'))mappedDeclarations.add(declaration[1]);
 const cleaned=architecture.css.replace(/(--cap-[\w-]+)\s*:\s*([^;{}]*);/g,(declaration,name)=>mappedDeclarations.has(name)||name.startsWith('--cap-selected-')||name.startsWith('--cap-derived-v4-')?'':declaration)
  .replace(/[^{}]+\{\s*\}/g,'').replace(/^[ \t]+$/gm,'');
 const combined=(cleaned+css).split('\n').map(line=>line.trimEnd()).join('\n');
 return {...architecture,css:combined,publicRoles,tokenContract:contract,canonicalGraph:runtimeV4Graph};
}
