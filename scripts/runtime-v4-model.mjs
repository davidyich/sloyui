import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { URL as NodeURL } from 'node:url';

// The Figma graph is the authored contract. Runtime adapters resolve it; they
// never independently derive a second set of theme/surface colors.
const graphText = readFileSync(import.meta.url.startsWith('file:')?new NodeURL('../figma/token-system-v4/graph.json', import.meta.url):'figma/token-system-v4/graph.json', 'utf8');
export const runtimeV4Graph = JSON.parse(graphText);
export const runtimeV4GraphHash = createHash('sha256').update(graphText).digest('hex');
const sourceText=readFileSync(import.meta.url.startsWith('file:')?new NodeURL('../figma/token-system-v4/source.json',import.meta.url):'figma/token-system-v4/source.json','utf8');
if(runtimeV4Graph.schemaVersion!==4||runtimeV4Graph.sourceHash!==createHash('sha256').update(sourceText).digest('hex'))throw new Error('Stale v4 graph. Run node figma/token-system-v4/build.mjs before building the runtime.');
export const surfaceCompatibility = { base:'Shell', page:'Shell', shell:'Shell', canvas:'Workspace', inset:'Workspace', workspace:'Workspace', raised:'Content', panel:'Content', content:'Content', floating:'Overlay', overlay:'Overlay', invert:'Invert', glass:'Glass' };
export const v4Variables = new Map(runtimeV4Graph.collections.flatMap(collection => collection.variables.map(token => [collection.key+'/'+token.name, {...token, collection:collection.key}])));
export const v4CSSName = path => '--cap-v4-'+path.replaceAll('/','-').replaceAll('.','_').toLowerCase();
export function resolveV4(path, selection={}, seen=[]) {
  if(seen.includes(path))throw new Error('V4 alias cycle: '+[...seen,path].join(' -> '));
  const token=v4Variables.get(path);
  if(!token)throw new Error('Unknown v4 token '+path);
  const axis=runtimeV4Graph.axes[token.collection];
  const mode=selection[token.collection]??axis?.default??'Value';
  const value=token.values[mode];
  if(value===undefined)throw new Error('Unknown v4 mode '+token.collection+'/'+mode);
  return value?.alias?resolveV4(value.alias,selection,[...seen,path]):value?.color?{...resolveV4(value.color.alias,selection,[...seen,path]),a:resolveV4(value.opacity.alias,selection,[...seen,path])/100}:value;
}
export const toRuntimeColor = color => ({ colorSpace:'srgb', components:[color.r,color.g,color.b], alpha:color.a });
export function legacyColorPath(name) {
  if(name==='surface/current')return 'Theme/surface/bg';
  if(name==='surface/block')return 'Theme/surface/block';
  if(name.startsWith('content/'))return 'Theme/'+name;
  if(name==='disabled/background')return 'Theme/surface/disabled';
  if(name==='disabled/text')return 'Theme/content/disabled';
  if(name==='focus/ring'||name==='border/emphasis')return 'Theme/border/focus';
  if(/^border\/(subtle|default|strong)$/.test(name))return 'Theme/'+name;
  if(name==='border/panel')return 'Theme/border/subtle';
  if(name==='border/overlay')return 'Theme/border/default';
  if(name==='border/control')return 'Theme/border/neutral-normal';
  if(name==='border/control-hover')return 'Theme/border/neutral-hover';
  if(name==='border/control-pressed')return 'Theme/border/neutral-pressed';
  if(name==='overlay/dim')return 'Theme/surface/scrim';
  if(name.startsWith('control/'))return legacyColorPath('element/neutral/'+name.slice(8));
  if(name.startsWith('feedback/')) {
    const [,tone,role]=name.split('/');
    return legacyColorPath('element/'+({danger:'red',success:'green',warning:'orange',info:'blue'}[tone])+'/'+role);
  }
  if(/^(element|action|action-vivid)\//.test(name)) {
    const [kind,legacyHue,role]=name.split('/');
    const hue=legacyHue==='gray'?'neutral':runtimeV4Graph.conventions.legacyAccentAliases[legacyHue]??legacyHue;
    if(role==='disabled')return 'Theme/surface/disabled';
    if(role==='disabled-text')return 'Theme/content/disabled';
    if(role==='text')return 'Theme/content/'+(kind==='element'?hue:hue==='neutral'?'on-primary':'on-primary/'+hue);
    if(role.startsWith('border'))return 'Theme/border/'+hue+'-'+(role.slice(7)||'normal');
    return 'Theme/surface/'+(kind==='element'?'secondary':'primary')+'/'+hue+'-'+role;
  }
  // The group shell paints block once. Hover/pressed are paints on its child,
  // composed over that painted shell, not replacement colors on surface/bg.
  // They replace each other on the child; they never stack on one another.
  if(name==='group/background'||name==='group/prefix')return 'Theme/surface/block';
  if(name==='group/hover'||name==='group/selected')return 'Theme/surface/secondary/neutral-hover';
  if(name==='group/pressed')return 'Theme/surface/secondary/neutral-pressed';
  if(name==='group/text')return 'Theme/content/primary';
  return null;
}

export function deriveDensitySource(source) {
  const modes={Default:{},Compact:{}};
  const bindings={};
  for(const role of Object.keys(source.modes.Default)) {
    if(/^size\/control\/(sm|md|lg|xl)$/.test(role))bindings[role]='Density/adaptive/control/height-'+role.split('/').at(-1);
    // Icon/counter/marker dimensions are fixed. Density alters whitespace,
    // never the readable icon or selection marker itself.
    else if(/^size\/(inline|marker|track)\//.test(role))bindings[role]=null;
    for(const mode of Object.keys(modes)) {
      const unit=resolveV4('Density/adaptive/padding/xs',{Density:mode});
      const normal=source.modes.Default[role];
      let value;
      if(bindings[role])value=resolveV4(bindings[role],{Density:mode});
      else if(/^size\/(inline|marker|track)\//.test(role))value=normal;
      else if(role==='space/half')value=resolveV4('Density/fixed/gap/inline-xs',{Density:mode});
      else if(role.startsWith('size/inside/')) {
        const size=role.split('/').at(-1),control=bindings['size/control/'+size];
        value=(control?resolveV4(control,{Density:mode}):16+2*Math.round(unit*.75))+20;
      }
      else if(role.startsWith('size/')) {
        // Component shells preserve their fixed content and scale only the
        // surrounding inset. xs legacy controls have a fixed 16 px line.
        const fixed=role.startsWith('size/control/')?16:Math.min(16,normal);
        value=fixed+2*Math.round((normal-fixed)/8*unit);
      }
      else value=Math.round(normal/4*unit);
      modes[mode][role]=value;
    }
  }
  const componentBindings={...source.componentBindings};
  for(const [component] of Object.entries(source.componentBindings)) {
    const match=/^(button|input)\/inset\/inline\/(sm|md|lg|xl)$/.exec(component);
    if(match) {
      const role='space/control/inset-x/'+match[2];
      componentBindings[component]=role;
      bindings[role]='Density/adaptive/control/padding-x-'+match[2];
      for(const mode of Object.keys(modes))modes[mode][role]=resolveV4(bindings[role],{Density:mode});
    }
  }
  return {...source,schemaVersion:4,source:'figma/token-system-v4/graph.json',formula:'Adaptive spacing = round(k × u), u = 4 / 3; fixed typography, icons and touch targets.',modes,componentBindings,v4Bindings:bindings};
}
