import fs from 'node:fs';
import {logicalName} from './figma-names.mjs';
const graph=JSON.parse(fs.readFileSync(new URL('./graph.json',import.meta.url)));
const key=process.argv[2],offset=Number(process.argv[3]||0),limit=Number(process.argv[4]||180);
const c=graph.collections.find(c=>c.key===key);
const baseline=process.argv[5]?JSON.parse(fs.readFileSync(process.argv[5])).collections.find(c=>c.key===key):null;
let changed=baseline?c.variables.filter(v=>{const old=baseline.variables.find(old=>old.name===v.name);return !old||JSON.stringify({...v,figmaName:undefined})!==JSON.stringify({...old,figmaName:undefined})||v.figmaName!==(old.figmaName??old.name);}):c.variables;
if(process.argv[6])changed=changed.filter(v=>process.argv[6]==='composed'?!!v.values.Value?.color:!v.values.Value?.color);
const part={...c,variables:changed.slice(offset,offset+limit)};
console.log(`
await Promise.all(['Regular','Medium','Semi Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const spec=${JSON.stringify(part)};
const collectionNames=${JSON.stringify(Object.fromEntries(graph.collections.map(c=>[c.key,c.name])))};
const collections=await figma.variables.getLocalVariableCollectionsAsync();
const cols=Object.fromEntries(Object.entries(collectionNames).map(([key,name])=>[key,collections.find(c=>c.name===name)]));
const all=await figma.variables.getLocalVariablesAsync();
${logicalName.toString()}
const byKey={};
for(const [key,c] of Object.entries(cols))for(const v of all.filter(v=>v.variableCollectionId===c.id))byKey[key+'/'+logicalName(key,v.name)]=v;
const c=cols[spec.key],ids=[];
function nativeValue(value){if(value?.alias){const target=byKey[value.alias];if(!target)throw new Error('Missing alias '+value.alias);return {type:'VARIABLE_ALIAS',id:target.id};}if(value?.color)return {color:nativeValue(value.color),opacity:nativeValue(value.opacity)};return value;}
for(const s of spec.variables){
 let v=byKey[spec.key+'/'+s.name];
 if(!v)v=figma.variables.createVariable(s.name,c,s.type);
 v.name=s.figmaName;
 v.scopes=s.scopes;v.description=s.description;
 v.setVariableCodeSyntax('WEB','var('+s.css+')');
 for(const mode of c.modes)v.setValueForMode(mode.modeId,nativeValue(s.values[mode.name]));
 byKey[spec.key+'/'+s.name]=v;ids.push(v.id);
}
return {collection:spec.key,offset:${offset},count:ids.length,variableIds:ids};
`);
