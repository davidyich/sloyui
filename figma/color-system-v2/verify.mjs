import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {graph,source,resolve,composite,contrast,luminance,chroma} from './build.mjs';
import {logicalName} from './figma-names.mjs';

const errors=[], pairs=[];let hierarchyChecks=0,nestedHierarchyChecks=0;const nestedFillContrasts=[];
const check=(ok,what)=>{if(!ok)errors.push(what);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
check(!graph.axes.accent&&!graph.collections.some(c=>c.key==='accent'),'Accent hues must be named variables, not modes');
for(const c of graph.collections) {
  check(new Set(c.variables.map(v=>v.name)).size===c.variables.length,`Duplicate variable in ${c.name}`);
  check(new Set(c.variables.map(v=>v.figmaName)).size===c.variables.length,`Duplicate Figma path in ${c.name}`);
  for(const v of c.variables) {
    check(v.type==='BOOLEAN'||!v.scopes.includes('ALL_SCOPES'),`Broad scope: ${c.key}/${v.name}`);
    check(v.css.startsWith('--sloy-v2-'),`Missing syntax: ${v.name}`);
    check(logicalName(c.key,v.figmaName)===v.name,`Non-reversible Figma path: ${v.name}`);
    for(const m of c.modes) {
      check(v.values[m]!==undefined,`Missing mode: ${v.name}/${m}`);
      check(['palette','primitives'].includes(c.key)||!!v.values[m]?.alias,`Raw semantic: ${c.key}/${v.name}/${m}`);
      const value=v.values[m];
      if(v.type==='COLOR'&&!value?.alias&&!value?.color){check(['r','g','b','a'].every(k=>Number.isFinite(value[k])&&value[k]>=0&&value[k]<=1),`Out-of-gamut color: ${v.name}/${m}`);check(value.a===1,`Baked color opacity: ${v.name}`);}
      if(value?.color)check(!!value.color.alias&&!!value.opacity?.alias,`Detached composed color: ${v.name}`);
    }
  }
}
for(const theme of source.themes)for(const scheme of source.schemes)for(const surface of source.surfaces) {
  const ctx={theme,scheme,surface},label=[theme,scheme,surface].join('/');
  const v=role=>resolve(`surface/${role}`,ctx);
  check(new Set(['primary','secondary','tertiary','muted'].map(role=>JSON.stringify(v(`content/${role}`)))).size===4,`Collapsed content ramp: ${label}`);
  for(const c of graph.collections)for(const token of c.variables)resolve(`${c.key}/${token.name}`,ctx);
  const bases=surface==='Glass'?['black','white'].map(x=>composite(v('surface/bg'),resolve(`palette/${x}`))):[v('surface/bg')];
  const backings=bases.flatMap(base=>[{name:'bg',value:base},...['tertiary','secondary'].flatMap(role=>source.states.map(state=>({name:`${role}/${state}`,value:composite(v(`surface/${role}/${state}`),base)})))]);
  function test(fg,bg,threshold,name) {const ratio=contrast(fg,bg);pairs.push({context:label,pair:name,ratio,threshold});check(ratio+1e-7>=threshold,`${label}/${name}: ${ratio.toFixed(3)} < ${threshold}`);}
  for(const role of ['primary','secondary','tertiary','muted'])for(const base of bases) {
    test(v(`content/${role}`),base,4.5,`content/${role} on bg`);
    for(const fill of ['secondary','tertiary'])for(const state of source.states)test(v(`content/${role}`),composite(v(`surface/${fill}/${state}`),base),4.5,`content/${role} on ${fill}/${state}`);
  }
  for(const role of ['primary','invert'])for(const state of source.states)test(v(`content/on-${role}`),v(`surface/${role}/${state}`),4.5,`on-${role}/${state}`);
  for(const state of source.states)test(v('content/inverted'),v(`surface/primary/${state}`),4.5,`inverted on primary/${state}`);
  for(const hue of source.accents) {
    check(!equal(v(`content/accent/${hue}/primary`),v(`content/accent/${hue}/secondary`)),`Collapsed accent content pair: ${label}/${hue}`);
    check(chroma(v(`content/accent/${hue}/primary`))>chroma(v(`content/accent/${hue}/secondary`))*1.5,`Indistinct accent saturation: ${label}/${hue}`);
    for(const {name:backing,value:base} of backings){
      const roles=['tertiary/normal','tertiary/active','secondary/normal','secondary/active'];
      const fills=roles.map(role=>composite(v(`surface/accent/${hue}/${role}`),base));
      const hierarchy=fills.map(fill=>contrast(fill,base));
      check(hierarchy.every((value,i)=>i===0||value>hierarchy[i-1]),`Nested hierarchy collapsed: ${label}/${hue} on ${backing}`);
      check(fills.every(fill=>(luminance(fill)-luminance(base))*(theme==='Dark'?1:-1)>0),`Nested direction reversed: ${label}/${hue} on ${backing}`);
      nestedHierarchyChecks++;
      for(const [i,fill] of fills.entries()) {
        nestedFillContrasts.push({context:label,hue,backing,role:roles[i],ratio:hierarchy[i]});
        for(const role of ['primary','secondary']) {
          test(v(`content/accent/${hue}/${role}`),fill,4.5,`${hue}/${role} on nested ${roles[i]} over ${backing}`);
          test(v(`content/${role}`),fill,4.5,`neutral/${role} on nested ${hue}/${roles[i]} over ${backing}`);
        }
      }
    }
    for(const base of bases){
      const hierarchy=['tertiary/normal','tertiary/active','secondary/normal','secondary/active'].map(role=>contrast(composite(v(`surface/accent/${hue}/${role}`),base),base));
      check(hierarchy.every((value,i)=>i===0||value>hierarchy[i-1]),`Accent hierarchy collapsed: ${label}/${hue}`);
      hierarchyChecks++;
    }
    for(const state of source.states)test(v(`content/accent/${hue}/on-primary`),v(`surface/accent/${hue}/primary/${state}`),4.5,`${hue}/on-primary/${state}`);
    for(const role of ['primary','secondary'])for(const base of bases) {
      test(v(`content/accent/${hue}/${role}`),base,4.5,`${hue}/${role} on bg`);
      for(const fill of ['secondary','tertiary'])for(const state of source.states)test(v(`content/accent/${hue}/${role}`),composite(v(`surface/accent/${hue}/${fill}/${state}`),base),4.5,`${hue}/${role} on ${fill}/${state}`);
    }
    for(const base of bases)test(v(`border/accent/${hue}`),base,3,`${hue}/border`);
  }
  for(const role of ['primary','secondary','tertiary','invert',...source.accents.flatMap(h=>['primary','secondary','tertiary'].map(r=>`accent/${h}/${r}`))])check(!equal(v(`surface/${role}/normal`),v(`surface/${role}/active`)),`${label}: identical states ${role}`);
  const standard={theme,scheme:'Standard',surface:'Shell'};
  for(const token of graph.collections.find(c=>c.key==='surface').variables.filter(v=>v.name.startsWith('stable/')||v.name.startsWith('alpha/'))) {
    const reference=token.name.includes('adaptive')?standard:{theme:'Light',scheme:'Standard',surface:'Shell'};
    check(equal(v(token.name),resolve(`surface/${token.name}`,reference)),`Alpha invariant: ${label}/${token.name}`);
  }
}
const report={contexts:20,contrastChecks:pairs.length,hierarchyChecks,nestedHierarchyChecks,nestedBackings:['bg','tertiary/normal','tertiary/active','secondary/normal','secondary/active'],minimumSecondaryFillContrast:Math.min(...nestedFillContrasts.filter(p=>p.role==='secondary/normal').map(p=>p.ratio)),minimumTextContrast:Math.min(...pairs.filter(p=>p.threshold===4.5).map(p=>p.ratio)),minimumBoundaryContrast:Math.min(...pairs.filter(p=>p.threshold===3).map(p=>p.ratio)),glassBackdrops:['pure black','pure white'],errors};
fs.writeFileSync(fileURLToPath(new URL('./verification.json',import.meta.url)),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
