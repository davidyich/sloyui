import fs from 'node:fs';
import {graph,resolve} from './build.mjs';
import {logicalName} from './figma-names.mjs';
function normalized(value) {
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalized(value[k])]));
 return typeof value==='number'?Math.fround(value):value;
}
function hash(value) {let h=2166136261;for(const ch of JSON.stringify(normalized(value))){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
const spec=graph.collections.map(c=>({key:c.key,name:c.name,modes:c.modes,hash:hash(c.variables.map(v=>({name:v.figmaName,type:v.type,scopes:[...v.scopes].sort(),css:`var(${v.css})`,values:v.values})).sort((a,b)=>a.name.localeCompare(b.name)))}));
const contexts=[];
for(const theme of graph.axes.theme)for(const scheme of graph.axes.scheme)for(const surface of graph.axes.surface){const ctx={theme,scheme,surface};const keys=graph.collections.filter(c=>['surface','opacity'].includes(c.key)).flatMap(c=>c.variables.map(v=>`${c.key}/${v.name}`));contexts.push({...ctx,hash:hash(keys.map(k=>[k,resolve(k,ctx)]))});}
const code=`
const spec=${JSON.stringify(spec)};
const expected=${JSON.stringify(contexts)};
${normalized.toString()}
${hash.toString()}
${logicalName.toString()}
const collections=await figma.variables.getLocalVariableCollectionsAsync();
const all=await figma.variables.getLocalVariablesAsync();
const byId={},byKey={},cols={};
for(const s of spec){const c=collections.find(c=>c.name===s.name);if(!c)throw new Error('Missing '+s.name);cols[s.key]=c;for(const v of all.filter(v=>v.variableCollectionId===c.id)){byId[v.id]=s.key+'/'+logicalName(s.key,v.name);byKey[s.key+'/'+logicalName(s.key,v.name)]=v;}}
function logicalValue(x){if(x?.type==='VARIABLE_ALIAS')return {alias:byId[x.id]};if(x?.color)return {color:logicalValue(x.color),opacity:logicalValue(x.opacity)};return x;}
const errors=[],collectionReports=[];
for(const s of spec){const c=cols[s.key];const actual=all.filter(v=>v.variableCollectionId===c.id).map(v=>({name:v.name,type:v.resolvedType,scopes:[...v.scopes].sort(),css:v.codeSyntax.WEB,values:Object.fromEntries(c.modes.map(m=>{const x=v.valuesByMode[m.modeId];return [m.name,logicalValue(x)];}))})).sort((a,b)=>a.name.localeCompare(b.name));const actualHash=hash(actual);if(actualHash!==s.hash)errors.push('Collection mismatch '+s.key);if(JSON.stringify(c.modes.map(m=>m.name))!==JSON.stringify(s.modes))errors.push('Mode mismatch '+s.key);collectionReports.push({key:s.key,variables:actual.length,hash:actualHash,expected:s.hash});}
await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('23:12'));
const probe=figma.createFrame();probe.name='Temporary color resolution audit';figma.currentPage.appendChild(probe);const probeId=probe.id;
const keys=Object.keys(byKey).filter(k=>k.startsWith('surface/')||k.startsWith('opacity/'));
let resolvedChecks=0;
try{for(const ctx of expected){for(const key of ['theme','scheme','surface'])probe.setExplicitVariableModeForCollection(cols[key],cols[key].modes.find(m=>m.name===ctx[key]).modeId);const actual=keys.map(k=>[k,byKey[k].resolveForConsumer(probe).value]);resolvedChecks+=actual.length;if(hash(actual)!==ctx.hash)errors.push('Resolution mismatch '+[ctx.theme,ctx.scheme,ctx.surface].join('/'));}}finally{probe.remove();}
return {collectionReports,contexts:expected.length,resolvedChecks,errors,createdNodeIds:[probeId],removedNodeIds:[probeId]};`;
fs.mkdirSync(new URL('../../artifacts/color-system-v2/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../../artifacts/color-system-v2/audit-figma.js',import.meta.url),code);
console.log(JSON.stringify({scriptCharacters:code.length,contexts:contexts.length}));
