import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
const graph=JSON.parse(readFileSync('src/tokens/figma-modes.json','utf8'));
const css=readFileSync('src/styles/tokens.css','utf8');
const source=JSON.parse(readFileSync('source/density.json','utf8'));
function resolve(path:string,density:string,seen:string[]=[]):number|string{
  if(seen.includes(path))throw new Error(`Cycle ${path}`);
  const [name,...parts]=path.split('/'),collection=graph.collections.find((item:any)=>item.name===name);
  const mode=name==='Density'?density:name==='Semantic'?'Panel':Object.keys(collection.modes)[0];
  const value=collection.modes[mode][parts.join('/')];
  if(value===undefined)throw new Error(`Missing ${path}`);
  return typeof value==='object'&&value.alias?resolve(value.alias,density,[...seen,path]):value;
}
it('switches shared geometry upstream of semantic and component aliases without changing raw dimensions',()=>{
  expect(resolve('Primitives/dimension/32','Compact')).toBe(32);
  expect(resolve('Semantic/size/control/md','Default')).toBe(32);
  expect(resolve('Semantic/size/control/md','Compact')).toBe(30);
  expect(resolve('Components/button/height/md','Compact')).toBe(30);
  expect(resolve('Components/input/inset/inline/md','Default')).toBe(12);
  expect(resolve('Components/input/inset/inline/md','Compact')).toBe(9);
  expect(resolve('Components/card/padding','Default')).toBe(16);
  expect(resolve('Components/card/padding','Compact')).toBe(12);
  const components=graph.collections.find((item:any)=>item.name==='Components').modes.Default;
  for(const role of ['counter/height/sm','selection/size/md','slider/thumb/md','slider/track/md'])expect(components[role].alias).toMatch(/^Density\//);
});
it('resolves every authored mode with nonnegative integral sizes and preserves the touch target and type scale',()=>{
  for(const [mode,values] of Object.entries(source.modes))for(const [role,value] of Object.entries(values as Record<string,number>)){
    expect(resolve('Density/'+role,mode)).toBe(value);
    expect(value).toBeGreaterThanOrEqual(0);expect(Number.isInteger(value)).toBe(true);
    expect(source.modes.Compact[role]).toBeLessThanOrEqual(source.modes.Default[role]);
  }
  expect(resolve('Semantic/touch/target','Compact')).toBe(44);
  expect(resolve('Semantic/typography/size/sm','Compact')).toBe(resolve('Semantic/typography/size/sm','Default'));
  expect(css).toContain(':root:not([data-density]), [data-density="default"]');
  expect(css).toContain('[data-density="compact"]');
});
