import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Emit small Figma Plugin API stages. Public identities are never renamed,
// created or deleted by this updater; internal cleanup checks actual usages.
const directory = path.dirname(fileURLToPath(import.meta.url));
const graphBytes = fs.readFileSync(path.join(directory, 'native-graph.json'));
const graph = JSON.parse(graphBytes);
const targetSHA = createHash('sha256').update(graphBytes).digest('hex');
const stage = process.argv[2] || 'plan';
const key = process.argv[3], offset = Number(process.argv[4] || 0), limit = Number(process.argv[5] || (key === 'surface' ? 25 : 50));
const internal = ['palette', 'theme', 'scheme'];
const hash = text => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
const allNames = new Map(graph.collections.flatMap(c => c.variables.map(v => [c.key + '/' + v.name, c.name + '|' + (v.figmaName ?? v.name)])));
const normalized = value => value?.alias ? allNames.get(value.alias) : value;
const spec = graph.collections.map(c => ({ key: c.key, name: c.name, modes: c.modes, names: c.variables.map(v => v.figmaName ?? v.name), hash: c.key === 'palette' ? null : hash(JSON.stringify(c.variables.map(v => [v.figmaName ?? v.name, v.type, c.modes.map(mode => [mode, normalized(v.values[mode])])]).sort((a, b) => a[0].localeCompare(b[0])))) }));
const base = `const spec=${JSON.stringify(spec)};const internal=new Set(${JSON.stringify(internal)});const collections=await figma.variables.getLocalVariableCollectionsAsync();const variables=await figma.variables.getLocalVariablesAsync();const owners=new Map(spec.map(c=>[c.key,collections.find(v=>v.name===c.name)]));for(const[c,owner]of owners)if(!owner)throw Error('Missing collection '+c);const collectionKeys=new Map([...owners].map(([key,c])=>[c.id,key]));const byId=new Map(variables.map(v=>[v.id,v]));const missing=[],stale=[];for(const c of spec){const owner=owners.get(c.key),live=variables.filter(v=>v.variableCollectionId===owner.id);for(const name of c.names)if(!live.some(v=>v.name===name))missing.push({key:c.key,name});for(const v of live)if(!c.names.includes(v.name))stale.push({key:c.key,name:v.name,id:v.id});}if(missing.some(v=>!internal.has(v.key)))throw Error('Missing public variables: '+JSON.stringify(missing.filter(v=>!internal.has(v.key))));`;
const staleSetup = `const targetSHA=${JSON.stringify(targetSHA)};const staleInternal=stale.filter(v=>internal.has(v.key)),staleIds=new Set(staleInternal.map(v=>v.id));`;
const aliasScanner = `function aliases(value,result){if(!value||typeof value!=='object')return;if(value.type==='VARIABLE_ALIAS'&&typeof value.id==='string'){result.add(value.id);return;}for(const item of Object.values(value))aliases(item,result);}`;
let code;
if (stage === 'plan') {
  code = base + `return {targetSHA:${JSON.stringify(targetSHA)},pages:figma.root.children.map(p=>({id:p.id,name:p.name})),expectedVariables:spec.reduce((sum,c)=>sum+c.names.length,0),missingInternal:missing,staleInternal:stale.filter(v=>internal.has(v.key)),extraPublic:stale.filter(v=>!internal.has(v.key)),publicIdentitiesPreserved:spec.filter(c=>!internal.has(c.key)).map(c=>({collection:c.name,count:c.names.length}))};`;
} else if (stage === 'create') {
  if (!internal.includes(key)) throw Error('Only internal variables can be created.');
  const owner = graph.collections.find(c => c.key === key);
  const input = owner.variables.slice(offset, offset + limit).map(v => ({ name: v.figmaName ?? v.name, type: v.type, scopes: v.scopes, css: v.css, description: v.description }));
  // The full public-name preflight runs before any mutation, including creates.
  code = base + `const input=${JSON.stringify(input)},owner=owners.get(${JSON.stringify(key)}),created=[],updated=[];for(const inputVariable of input){let v=variables.find(v=>v.variableCollectionId===owner.id&&v.name===inputVariable.name);if(!v){v=figma.variables.createVariable(inputVariable.name,owner,inputVariable.type);created.push(v.id);}else updated.push(v.id);v.scopes=inputVariable.scopes;v.description=inputVariable.description??'';v.setVariableCodeSyntax('WEB','var('+inputVariable.css+')');}return {collection:owner.name,created,updated,publicVariablesChanged:false};`;
} else if (stage === 'values') {
  const collection = graph.collections.find(c => c.key === key); if (!collection) throw Error('Unknown collection: ' + key);
  const inputs = collection.variables.slice(offset, offset + limit).map(v => ({ name: v.figmaName ?? v.name, values: v.values, scopes: v.scopes, css: v.css, description: v.description }));
  const used = new Set(inputs.flatMap(v => Object.values(v.values).filter(value => value?.alias).map(value => value.alias)));
  const targets = Object.fromEntries(graph.collections.flatMap(c => c.variables.filter(v => used.has(c.key + '/' + v.name)).map(v => [c.key + '/' + v.name, [c.name, v.figmaName ?? v.name]])));
  code = `const inputs=${JSON.stringify(inputs)},targets=${JSON.stringify(targets)};const cs=await figma.variables.getLocalVariableCollectionsAsync();const vs=await figma.variables.getLocalVariablesAsync();const cm=new Map(cs.map(c=>[c.name,c]));const vm=new Map(vs.map(v=>[v.variableCollectionId+'|'+v.name,v]));const owner=cm.get(${JSON.stringify(collection.name)});if(!owner)throw Error('Missing collection');for(const input of inputs)if(!vm.has(owner.id+'|'+input.name))throw Error('Missing target '+input.name);function resolve(value){if(!value?.alias)return value;const pair=targets[value.alias];if(!pair)throw Error('Missing reference specification '+value.alias);const target=vm.get(cm.get(pair[0])?.id+'|'+pair[1]);if(!target)throw Error('Create alias target first: '+value.alias);return figma.variables.createVariableAlias(target);}const values=inputs.map(input=>Object.fromEntries(Object.entries(input.values).map(([mode,value])=>{if(!owner.modes.some(m=>m.name===mode))throw Error('Missing mode '+mode);return[mode,resolve(value)];})));const updated=[];for(const [index,input]of inputs.entries()){const v=vm.get(owner.id+'|'+input.name);v.scopes=input.scopes;v.description=input.description??'';v.setVariableCodeSyntax('WEB','var('+input.css+')');for(const [mode,value]of Object.entries(values[index]))v.setValueForMode(owner.modes.find(m=>m.name===mode).modeId,value);updated.push(v.id);}return {collection:owner.name,updatedVariables:updated,count:updated.length};`;
 } else if (stage === 'scan-page') {
  if (!key) throw Error('scan-page requires a page ID.');
  code = base + staleSetup + aliasScanner + `
const pageId=${JSON.stringify(key)};const page=figma.root.children.find(p=>p.id===pageId);if(!page)throw Error('Unknown page '+pageId);
await figma.setCurrentPageAsync(page);
const direct=new Set(),references=[];function capture(value,node,property){const ids=new Set();aliases(value,ids);for(const id of ids)if(staleIds.has(id)){direct.add(id);references.push({id,nodeId:node.id,property});}}
let nodeCount=0;const previousSkipInvisible=figma.skipInvisibleInstanceChildren;figma.skipInvisibleInstanceChildren=false;
try{for(const node of [page,...page.findAll(()=>true)]){nodeCount++;capture(node.boundVariables,node,'boundVariables');for(const property of ['fills','strokes','effects','layoutGrids']){if(!(property in node))continue;const data=node[property];if(Array.isArray(data))for(const value of data)capture(value.boundVariables,node,property);}if(node.type==='TEXT')for(const segment of node.getStyledTextSegments(['fills']))if(Array.isArray(segment.fills))for(const paint of segment.fills)capture(paint.boundVariables,node,'text/fills');}}finally{figma.skipInvisibleInstanceChildren=previousSkipInvisible;}
return {pageId,pageName:page.name,fileKey:figma.fileKey??null,targetSHA,nodeCount,scannedStaleIds:[...staleIds].sort(),directIds:[...direct].sort(),references};`;
} else if (stage === 'cleanup-plan' || stage === 'cleanup') {
  if (!key) throw Error('Cleanup requires a JSON file containing all page scan receipts.');
  const payload = JSON.parse(fs.readFileSync(key, 'utf8'));
  const receipts = Array.isArray(payload) ? payload : payload.receipts;
  if (!Array.isArray(receipts)) throw Error('Expected receipts array or {receipts:[...]}.');
  code = base + staleSetup + aliasScanner + `
const receipts=${JSON.stringify(receipts)};
if(missing.length)throw Error('Create every desired target before cleanup: '+JSON.stringify(missing));
const pageIds=figma.root.children.map(p=>p.id).sort(),receiptIds=receipts.map(r=>r.pageId).sort();if(JSON.stringify(pageIds)!==JSON.stringify(receiptIds))throw Error('Page receipt coverage differs: '+JSON.stringify({pageIds,receiptIds}));
const expectedStaleIds=JSON.stringify([...staleIds].sort());const direct=new Set(),references=[];let nodeCount=0;
for(const r of receipts){if(r.targetSHA!==targetSHA)throw Error('Receipt graph SHA differs: '+r.pageId);if(r.fileKey!==(figma.fileKey??null))throw Error('Receipt file differs: '+r.pageId);if(JSON.stringify(r.scannedStaleIds)!==expectedStaleIds)throw Error('Receipt stale variable snapshot differs: '+r.pageId);if(!Array.isArray(r.directIds)||!Array.isArray(r.references))throw Error('Malformed receipt '+r.pageId);const reported=new Set(r.directIds);for(const id of reported){if(!staleIds.has(id))throw Error('Receipt contains unexpected direct ID '+id);direct.add(id);}for(const ref of r.references){if(!reported.has(ref.id)||typeof ref.nodeId!=='string')throw Error('Malformed reference '+r.pageId);references.push({...ref,pageId:r.pageId});}for(const id of reported)if(!r.references.some(ref=>ref.id===id))throw Error('Receipt lacks reference evidence '+id);nodeCount+=r.nodeCount;}
function hash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
const byName=new Map(variables.map(v=>[v.variableCollectionId+'|'+v.name,v]));
function norm(value){if(value?.type==='VARIABLE_ALIAS'){const v=byId.get(value.id);if(!v)throw Error('Broken alias '+value.id);const c=collections.find(c=>c.id===v.variableCollectionId);return c.name+'|'+v.name;}return value;}
for(const c of spec.filter(c=>c.key!=='palette')){const owner=owners.get(c.key);if(JSON.stringify(owner.modes.map(m=>m.name))!==JSON.stringify(c.modes))throw Error('Modes differ: '+c.name);const rows=c.names.map(name=>{const v=byName.get(owner.id+'|'+name);return[v.name,v.resolvedType,owner.modes.map(m=>[m.name,norm(v.valuesByMode[m.modeId])])]});const actual=hash(JSON.stringify(rows.sort((a,b)=>a[0].localeCompare(b[0]))));if(actual!==c.hash)throw Error('Desired aliases/values not fully applied: '+c.name+' '+actual+' != '+c.hash);}
function captureStyle(value,source){const ids=new Set();aliases(value,ids);for(const id of ids){direct.add(id);if(staleIds.has(id))references.push({id,source});}}
const styleGroups=await Promise.all([figma.getLocalPaintStylesAsync(),figma.getLocalTextStylesAsync(),figma.getLocalEffectStylesAsync(),figma.getLocalGridStylesAsync()]);let styleCount=0;for(const styles of styleGroups)for(const style of styles){styleCount++;captureStyle(style.boundVariables,{type:'style',id:style.id,name:style.name});for(const property of ['paints','effects','layoutGrids'])if(property in style&&Array.isArray(style[property]))for(const value of style[property])captureStyle(value.boundVariables,{type:'style-paint',id:style.id,name:style.name,property});}
const reachable=new Set();function visit(id){if(reachable.has(id))return;reachable.add(id);const v=byId.get(id);if(!v)return;for(const value of Object.values(v.valuesByMode)){const targets=new Set();aliases(value,targets);for(const target of targets)visit(target);}}
for(const v of variables)if(!internal.has(collectionKeys.get(v.variableCollectionId)))visit(v.id);
for(const c of spec)for(const name of c.names)visit(byName.get(owners.get(c.key).id+'|'+name).id);
for(const id of direct)visit(id);
const blocked=staleInternal.filter(v=>reachable.has(v.id)),removable=staleInternal.filter(v=>!reachable.has(v.id));
const incomingFromOutside=[];const removableIds=new Set(removable.map(v=>v.id));for(const v of variables)if(!removableIds.has(v.id))for(const value of Object.values(v.valuesByMode)){const targets=new Set();aliases(value,targets);for(const target of targets)if(removableIds.has(target))incomingFromOutside.push({from:v.id,to:target});}
if(incomingFromOutside.length)throw Error('Unsafe cleanup: live incoming aliases '+JSON.stringify(incomingFromOutside));
const deleted=[];${stage === 'cleanup' ? `if(blocked.length)throw Error('Stale internal variables are still used; rebind before cleanup: '+JSON.stringify({blocked,references:references.filter(r=>blocked.some(v=>v.id===r.id))}));for(const item of removable.sort((a,b)=>['scheme','theme','palette'].indexOf(a.key)-['scheme','theme','palette'].indexOf(b.key))){byId.get(item.id).remove();deleted.push(item);}` : ''}
return {dryRun:${stage !== 'cleanup'},targetSHA,scannedPages:receiptIds,nodeCount,styleCount,liveDirectReferences:direct.size,removable,blocked,directStaleReferences:references,incomingFromOutside,deleted,publicVariableIdsPreserved:true,createdVariables:0};`;
} else throw Error('Stages: plan | create <key> <offset> | values <key> <offset> [limit] | scan-page <pageId> | cleanup-plan <receipts.json> | cleanup <receipts.json>');
if (Buffer.byteLength(code) > 50000) throw Error('Figma script exceeds 50000 bytes: ' + Buffer.byteLength(code));
console.log(code);
