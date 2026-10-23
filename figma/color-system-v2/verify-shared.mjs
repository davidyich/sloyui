import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {graph,source,historicalSource,canonicalGraph,resolve,resolveCanonical,composite,contrast} from './build.mjs';
import {figmaName,logicalName} from './figma-names.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
const errors=[];
let checks=0,resolvedChecks=0,canonicalRoleChecks=0,contrastChecks=0;
const check=(ok,message)=>{checks++;if(!ok)errors.push(message);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sameColor=(a,b)=>['r','g','b','a'].every(k=>Math.abs((a[k]??1)-(b[k]??1))<1e-9);
const collections=new Map(graph.collections.map(c=>[c.key,c]));
const variables=new Map(graph.collections.flatMap(c=>c.variables.map(v=>[`${c.key}/${v.name}`,v])));
const palette=collections.get('palette');
check(palette.variables.length===863,'Palette must contain exactly 863 variables.');
check(source.accents.length===20,'Exactly twenty canonical hues are required.');
check(source.alphaSteps.length===20,'Exactly twenty public alpha steps are required.');
check(!graph.axes.accent,'Accent must not be a collection mode.');
check(equal(graph.axes.theme,historicalSource.themes),'Legacy Theme modes changed.');
check(equal(graph.axes.scheme,historicalSource.schemes),'Legacy Scheme modes changed.');
check(historicalSource.surfaces.every((name,i)=>graph.axes.surface[i]===name),'Legacy Surface modes must keep their names and order.');
for(const hue of source.accents){
  const steps=palette.variables.filter(v=>v.name.startsWith(hue+'/')).map(v=>v.name.slice(hue.length+1));
  check(equal(steps,Array.from({length:41},(_,i)=>String(i+1).padStart(2,'0'))),`Shared ramp order: ${hue}`);
}
check(equal(palette.variables.filter(v=>v.name.startsWith('gray/')).map(v=>Number(v.name.slice(5))),Array.from({length:41},(_,i)=>i*25)),'Neutral ramp must retain 0–1000 by 25.');
const canonicalPalette=new Map(canonicalGraph.collections.find(c=>c.key==='Palette').variables.map(v=>[v.name,v]));
for(const v of palette.variables){
  check(equal(v.values,canonicalPalette.get(v.name)?.values),`Palette detached from canonical RGB: ${v.name}`);
  check(v.values.Value?.a===1&&/^(?:[a-z]+\/\d+|black|white)$/.test(v.name),`Non-opaque or semantic Palette entry: ${v.name}`);
}
const standaloneLogicalName=Function(`return (${logicalName.toString()})`)();
const allowedTargets={theme:new Set(['palette','opacity']),scheme:new Set(['theme']),surface:new Set(['scheme']),opacity:new Set(['primitives']),geometry:new Set(['primitives']),reactions:new Set(['primitives'])};
for(const c of graph.collections){
  check(new Set(c.variables.map(v=>v.name)).size===c.variables.length,`Duplicate logical key in ${c.key}`);
  check(new Set(c.variables.map(v=>v.figmaName)).size===c.variables.length,`Duplicate Figma path in ${c.key}`);
  for(const v of c.variables){
    const key=`${c.key}/${v.name}`;
    check(logicalName(c.key,v.figmaName)===v.name,`Non-reversible picker path: ${key}`);
    check(standaloneLogicalName(c.key,v.figmaName)===v.name,`Native embedded mapper requires external state: ${key}`);
    check(v.figmaName===figmaName(c.key,v.name),`Stale Figma name: ${key}`);
    check(v.type==='BOOLEAN'||!v.scopes.includes('ALL_SCOPES'),`Broad scope: ${key}`);
    if(v.pickerAlias){
      check(c.key==='surface'&&v.scopes.length===0,`Invalid hidden picker alias: ${key}`);
      for(const theme of source.themes)for(const scheme of source.schemes)for(const surface of source.surfaces){
        const ctx={theme,scheme,surface};
        check(sameColor(resolve(key,ctx),resolve(`surface/${v.pickerAlias}`,ctx)),`Picker alias changes color: ${key}`);
      }
    }
    check(v.css===`--sloy-v2-${c.key}-${v.name.replaceAll('/','-')}`,`Changed CSS identity: ${key}`);
    check(equal(Object.keys(v.values).sort(),[...c.modes].sort()),`Mode coverage: ${key}`);
    if(['theme','scheme','surface'].includes(c.key)&&v.name.includes('/surface/accent/'))check(v.figmaName.startsWith('surface/')&&!v.figmaName.includes('/accent/'),`Context-first accent picker path: ${key}`);
    for(const [mode,value] of Object.entries(v.values)){
      const label=`${key}/${mode}`;
      const refs=value?.alias?[{reference:value.alias,type:v.type}]:value?.color?.alias&&value?.opacity?.alias?[{reference:value.color.alias,type:'COLOR'},{reference:value.opacity.alias,type:'FLOAT'}]:[];
      check(['palette','primitives'].includes(c.key)||refs.length>0,`Raw semantic value: ${label}`);
      if(refs.length===2){
        check(c.key==='theme'&&v.type==='COLOR',`Composition outside Theme: ${label}`);
        check(value.color.alias.startsWith('palette/')&&value.opacity.alias.startsWith('opacity/'),`Composition must use Palette + Opacity: ${label}`);
      }
      for(const {reference,type} of refs){
        const target=variables.get(reference);
        check(!!target,`Unresolved alias: ${label} → ${reference}`);
        check(target?.type===type,`Alias type mismatch: ${label} → ${reference}`);
        check(allowedTargets[c.key]?.has(reference.split('/')[0]),`Collection layer skipped: ${label} → ${reference}`);
      }
      if(c.key==='palette')check(['r','g','b','a'].every(k=>Number.isFinite(value[k])&&value[k]>=0&&value[k]<=1)&&value.a===1,`Invalid opaque color: ${label}`);
      if(c.key==='primitives')check(v.type==='BOOLEAN'?typeof value==='boolean':typeof value==='number'&&Number.isFinite(value),`Raw non-numeric primitive: ${label}`);
    }
  }
}
for(const c of ['surface','scheme','theme']){
  for(const hue of ['neutral',...source.accents])for(const state of ['normal','active']){
    const leaf=`surface/secondary/${hue}-${state}`;
    const expected=c==='theme'?`${leaf}-standard-shell`:c==='scheme'?`${leaf}-shell`:leaf;
    check(collections.get(c).variables.some(v=>v.figmaName===expected),`Missing public role leaf: ${c}/${expected}`);
  }
}
const paletteContexts=JSON.parse(fs.readFileSync(path.join(dir,'../token-system-v4/palette-contexts.json')));
let minimumPairedContrast=Infinity;
for(const theme of source.themes)for(const scheme of source.schemes)for(const surface of source.surfaces){
  const context={theme,scheme,surface},canonicalContext={Theme:theme,SurfaceScheme:scheme,Surface:surface};
  const label=`${theme}/${scheme}/${surface}`;
  for(const key of variables.keys()){
    try{resolve(key,context);resolvedChecks++;}catch(error){check(false,`${label}: ${error.message}`);}
  }
  for(const [role,value] of Object.entries(paletteContexts[label]??{}))check(sameColor(resolve(`surface/${role}`,context),value),`Canonical neutral backing mismatch: ${label}/${role}`);
  check(!!paletteContexts[label],`Missing canonical neutral context: ${label}`);
  for(const hue of source.accents){
    for(const family of ['primary','secondary','tertiary'])for(const state of ['normal','active']){
      const actual=resolve(`surface/surface/accent/${hue}/${family}/${state}`,context);
      const expected=resolveCanonical(`Theme/surface/${family}/${hue}-${state==='normal'?'normal':'pressed'}`,canonicalContext);
      check(sameColor(actual,expected),`Canonical accent selection mismatch: ${label}/${hue}/${family}/${state}`);canonicalRoleChecks++;
    }
    for(const [role,key] of [['primary',`content/${hue}`],['secondary',`content/secondary/${hue}`],['on-primary',`content/on-primary/${hue}`]]){
      check(sameColor(resolve(`surface/content/accent/${hue}/${role}`,context),resolveCanonical(`Theme/${key}`,canonicalContext)),`Canonical accent ink mismatch: ${label}/${hue}/${role}`);canonicalRoleChecks++;
    }
  }
  for(const family of ['primary','invert',...source.accents.map(hue=>`accent/${hue}/primary`)])for(const state of source.states){
    const background=resolve(`surface/surface/${family}/${state}`,context);
    const ink=resolve(`surface/content/${family.startsWith('accent/')?family.replace(/primary$/,'on-primary'):`on-${family}`}`,context);
    const ratio=contrast(composite(ink,background),background);minimumPairedContrast=Math.min(minimumPairedContrast,ratio);contrastChecks++;
    check(ratio+1e-7>=4.5,`Unreadable paired primary: ${label}/${family}/${state} (${ratio})`);
  }
  for(const v of collections.get('surface').variables.filter(v=>v.name.startsWith('alpha/')||v.name.startsWith('stable/'))){
    const reference={theme:v.name.startsWith('alpha/adaptive/')?theme:'Light',scheme:'Standard',surface:'Shell'};
    check(sameColor(resolve(`surface/${v.name}`,context),resolve(`surface/${v.name}`,reference)),`Alpha/stable axis drift: ${label}/${v.name}`);
  }
}
const baselineFlag=process.argv.indexOf('--baseline');
const baselinePath=baselineFlag>=0?process.argv[baselineFlag+1]:null;
const compatibility={baseline:baselinePath,checkedKeys:0,retainedKeys:0,removedPaletteKeys:[],errors:[]};
if(baselinePath){
  const baseline=JSON.parse(fs.readFileSync(baselinePath));
  for(const c of baseline.collections){
    const current=collections.get(c.key);
    check(current?.name===c.name,`Legacy collection renamed: ${c.key}`);
    check(c.modes.every((mode,i)=>current.modes[i]===mode),`Legacy mode reordered: ${c.key}`);
    for(const old of c.variables){
      const key=`${c.key}/${old.name}`,current=variables.get(key);
      if(c.key==='palette'){if(!current)compatibility.removedPaletteKeys.push(key);continue;}
      compatibility.checkedKeys++;
      if(current)compatibility.retainedKeys++;else compatibility.errors.push(`Missing ${key}`);
      check(!!current,`Legacy identity missing: ${key}`);
      if(!current)continue;
      check(current.type===old.type&&current.css===old.css,`Legacy type/CSS identity changed: ${key}`);
      const deduplicatedInk=c.key==='surface'&&/^content\/accent\/[^/]+\/on-primary$/.test(old.name)&&current.scopes.length===0&&['content/on-primary','content/on-bright-primary'].includes(current.pickerAlias);
      check(equal(current.scopes,old.scopes)||deduplicatedInk,`Legacy scopes changed: ${key}`);
      check(logicalName(c.key,old.figmaName??old.name)===old.name,`Old native name no longer resolves: ${key}`);
      if(['geometry','reactions','primitives','opacity'].includes(c.key))check(equal(current.values,old.values),`Fixed geometry/reaction/opacity changed: ${key}`);
    }
  }
}
const savedGraph=JSON.parse(fs.readFileSync(path.join(dir,'graph.json')));
check(equal(savedGraph,graph),'Generated v2 graph is stale; run its build after canonical v4.');
const report={pass:errors.length===0,checks,resolvedChecks,canonicalRoleChecks,contrastChecks,minimumPairedContrast,contexts:source.themes.length*source.schemes.length*source.surfaces.length,sharedPalette:palette.variables.length,canonicalSourceHash:graph.bridge.sourceHash,canonicalGraphSha256:graph.bridge.graphSha256,collections:graph.collections.map(c=>({key:c.key,variables:c.variables.length,modes:c.modes})),compatibility,errors};
const output=path.join(dir,'../../artifacts/v2-shared-bridge/verification.json');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,compatibility:{...compatibility,removedPaletteKeys:compatibility.removedPaletteKeys.length}},null,2));
if(errors.length)process.exitCode=1;
