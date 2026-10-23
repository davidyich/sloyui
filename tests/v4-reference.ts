import { readFileSync } from 'node:fs';

// Test-only reference resolver reads the authored graph directly, without
// importing the runtime adapter or its compatibility transformations.
export const v4Reference=JSON.parse(readFileSync('figma/token-system-v4/graph.json','utf8'));
export const legacySurfaceModes:Record<string,string>={base:'Shell',canvas:'Workspace',raised:'Content',floating:'Overlay'};
export function referenceColor(path:string,theme:string,surface:string,scheme='Standard'):{colorSpace:string;components:number[];alpha:number} {
 const selection:Record<string,string>={Theme:theme,Surface:legacySurfaceModes[surface]??surface,SurfaceScheme:scheme};
 const get=(path:string,seen:string[]=[]):any=>{
  if(seen.includes(path))throw Error('Reference graph cycle '+path);
  const [key,...parts]=path.split('/');
  const collection=v4Reference.collections.find((collection:any)=>collection.key===key);
  const token=collection.variables.find((token:any)=>token.name===parts.join('/'));
  const value=token.values[selection[key]??v4Reference.axes[key]?.default??'Value'];
  return value?.alias?get(value.alias,[...seen,path]):value?.color?{...get(value.color.alias,[...seen,path]),a:get(value.opacity.alias,[...seen,path])/100}:value;
 };
 const {r,g,b,a}=get(path);
 return {colorSpace:'srgb',components:[r,g,b],alpha:a};
}
