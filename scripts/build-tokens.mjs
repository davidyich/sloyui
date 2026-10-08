import { separateFigmaContexts } from './figma-context-graph.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import { readJSON, foundation, palette, hues, surfaces, themes, states, scales, surfaceRules, buildColorModel, hex } from './color-model.mjs';
const {version}=readJSON('package.json');
const {contexts,audit,secondaryPrimitives}=buildColorModel();
const cssName=name=>'--cap-'+name.replaceAll('/','-');
const alias=name=>({alias:name});
const prim={...palette,...secondaryPrimitives},metadata={},legacyNames={},alphaPrimitives={};
const primitive=(name,value,type,scopes,unit)=>{prim[name]=value;metadata['Primitives/'+name]={type,scopes,unit,css:cssName(name)};};
for(const name of [...Object.keys(palette),...Object.keys(secondaryPrimitives)])metadata['Primitives/'+name]={type:'COLOR',scopes:[],css:cssName(name)};
const base=Object.fromEntries(Object.entries(foundation.scalars).flatMap(([group,values])=>Object.entries(values).map(([slug,value])=>[`--${group}-${slug}`,String(value)+(group==='font-weight'?'':'px')])));
for(const [group,values] of Object.entries(foundation.scalars))for(const [slug,n] of Object.entries(values)){
 const name=group==='radius'?'number/radius/'+slug:({'font-size':'font/size','line-height':'font/line-height','prose-line-height':'font/prose-line-height','font-weight':'font/weight'}[group]||group)+'/'+slug;
 primitive(name,n,'FLOAT',group==='font-size'?['FONT_SIZE']:group==='line-height'||group==='prose-line-height'?['LINE_HEIGHT']:group==='font-weight'?['FONT_WEIGHT']:['CORNER_RADIUS'],group==='font-weight'?'number':'px');legacyNames[group+'-'+slug]=name;
}
for(const [size,n]of Object.entries({xs:22,sm:28,md:32,lg:36,xl:44})) {primitive('number/control-size/'+size,n,'FLOAT',['WIDTH_HEIGHT'],'px');legacyNames['el-h-'+(size==='md'?'base':size)]='number/control-size/'+size;legacyNames['el-w-'+(size==='md'?'base':size)]='number/control-size/'+size;}
for(const n of [0,1,2,3,4,5,6,8,10,12,16]){primitive('number/spacing/'+n,n*4,'FLOAT',['GAP'],'px');legacyNames['space-'+n]='number/spacing/'+n;}
for(const [size,n]of Object.entries({xs:14,sm:16,md:18,lg:20,xl:24}))primitive('number/inline-counter-size/'+size,n,'FLOAT',['WIDTH_HEIGHT'],'px');
primitive('font/size/micro',9,'FLOAT',['FONT_SIZE'],'px');
primitive('font/size/tiny',10,'FLOAT',['FONT_SIZE'],'px');
primitive('number/border/width',.5,'FLOAT',['STROKE_FLOAT'],'px');
primitive('number/divider/width',1,'FLOAT',['STROKE_FLOAT'],'px');
primitive('number/border/none',0,'FLOAT',['STROKE_FLOAT'],'px');
primitive('number/spacing/half',2,'FLOAT',['GAP'],'px');
Object.assign(legacyNames,{'border-width':'number/border/width','item-gap':'number/spacing/half','item-gap-roomy':'number/spacing/1'});
for(const [mode,factor] of Object.entries({compact:.6,default:1,rounded:1.75}))primitive('number/radius-scale/'+mode,factor,'FLOAT',[],'number');
for(const [mode,inset] of Object.entries({compact:0,default:0,rounded:6}))primitive('number/radius-inset/'+mode,inset,'FLOAT',['GAP'],'px');
primitive('number/radius/compact',4.8,'FLOAT',['CORNER_RADIUS'],'px');primitive('number/radius/full',9999,'FLOAT',['CORNER_RADIUS'],'px');
Object.assign(legacyNames,{'border-radius-base':'number/radius/lg','border-radius-small':'number/radius/compact','radius-base':'number/radius/lg','radius-small':'number/radius/compact','radius-full':'number/radius/full'});
for(const [size,diameter]of Object.entries({xs:14,sm:16,md:18,lg:22,xl:24})){primitive('number/selection-size/'+size,diameter,'FLOAT',['WIDTH_HEIGHT'],'px');primitive('number/slider-thumb/'+size,diameter,'FLOAT',['WIDTH_HEIGHT'],'px');primitive('number/slider-track/'+size,size==='xs'?3:size==='sm'?4:size==='md'?5:size==='lg'?6:8,'FLOAT',['WIDTH_HEIGHT'],'px');}
for(const [name,value]of Object.entries({fast:120,normal:180,slow:260})){primitive('number/duration/'+name,value,'FLOAT',[],'ms');legacyNames['duration-'+name]='number/duration/'+name;}
for(const [name,value]of Object.entries({'focus/width':2,'focus/offset':3,'overlay/gutter':12,'overlay/gap':12,'overlay/padding':8,'touch/target':44})){primitive('number/'+name,value,'FLOAT',name.startsWith('focus')?['STROKE_FLOAT']:['GAP'],'px');legacyNames[name.replaceAll('/','-')]='number/'+name;}
for(const [name,value]of Object.entries({sans:'Inter',serif:'Georgia',mono:'Courier New',code:'Overpass Mono'})){primitive('font/family/'+name,value,'STRING',['FONT_FAMILY']);legacyNames['font-'+name]='font/family/'+name;}
const elevation={floating:[[0,3,14,-2],[0,12,40,-8]],popover:[[0,4,18,-3],[0,16,56,-10]],modal:[[0,6,24,-4],[0,24,80,-12]]};
for(const [role,layers]of Object.entries(elevation))for(const [i,layer]of layers.entries())for(const [j,field]of ['x','y','blur','spread'].entries())primitive(`number/elevation/${role}/${i?'ambient':'contact'}/${field}`,layer[j],'FLOAT',['EFFECT_FLOAT'],'px');
for(const n of [0,2,4,6,8,10,12,16,24,32,48,64,100]){const step=String(n).padStart(2,'0');primitive('number/opacity/'+step,n,'FLOAT',['OPACITY'],'number');for(const neutral of ['black','white']){const name='alpha/'+neutral+'/'+step;primitive(name,{...palette['palette/'+neutral],alpha:n/100},'COLOR',[]);alphaPrimitives[name]={neutral,step};}}
const semantic={};
for(const [mode,ctx]of Object.entries(contexts)){
 semantic[mode]=Object.fromEntries(Object.entries(ctx.values).map(([name,p])=>[name,alias('Primitives/'+p)]));
 const neutral=ctx.theme==='Light'?'black':'white';for(const [state,step]of Object.entries({normal:'00',hover:ctx.theme==='Light'?'04':'06',pressed:ctx.theme==='Light'?'08':'10'})){semantic[mode]['reaction/'+state]=alias('Primitives/alpha/'+neutral+'/'+step);semantic[mode]['reaction/'+state+'-opacity']=alias('Primitives/number/opacity/'+step);metadata['Semantic/reaction/'+state+'-opacity']={type:'FLOAT',scopes:['OPACITY'],unit:'number',css:cssName('reaction/'+state+'-opacity')};}semantic[mode]['reaction/base']=alias('Primitives/palette/'+neutral);
 for(const [layer,alpha]of Object.entries({contact:ctx.theme==='Light'?.06:.10,ambient:ctx.theme==='Light'?.10:.14})){const name='effect/shadow/'+layer+'/'+ctx.theme;primitive(name,{colorSpace:'srgb',components:[0,0,0],alpha},'COLOR',['EFFECT_COLOR']);semantic[mode]['shadow/'+layer]=alias('Primitives/'+name);}
 const dim='effect/overlay/'+ctx.theme;primitive(dim,{colorSpace:'srgb',components:[0,0,0],alpha:ctx.theme==='Light'?.32:.58},'COLOR',[]);semantic[mode]['overlay/dim']=alias('Primitives/'+dim);
}
for(const name of Object.keys(Object.values(semantic)[0]))if(!metadata['Semantic/'+name])metadata['Semantic/'+name]={type:'COLOR',css:cssName(name),scopes:name.includes('text')||name.startsWith('content/')?['TEXT_FILL']:name.startsWith('border/')||name.includes('/border')||name.startsWith('focus/')?['STROKE_COLOR']:name.startsWith('shadow/')?['EFFECT_COLOR']:['FRAME_FILL','SHAPE_FILL']};
for(const name of Object.keys(Object.values(semantic)[0]).filter(name=>name.startsWith('action-vivid/')))metadata['Semantic/'+name].css='--cap-accent-vivid-'+name.split('/').at(-1);
const borders={Off:{'border/width':alias('Primitives/number/border/none')},On:{'border/width':alias('Primitives/number/border/width')}};
metadata['Borders/border/width']={type:'FLOAT',scopes:['STROKE_FLOAT'],unit:'px',css:'--cap-decoration-width'};
const graph={version,modes:hues,states,contexts:Object.fromEntries(Object.entries(contexts).map(([k,v])=>[k,{theme:v.theme,surface:v.surface}])),collections:[{name:'Primitives',modes:{Value:prim}},...separateFigmaContexts(semantic,metadata),{name:'Borders',modes:borders}],metadata,legacyNames,note:'Independent Sloy UI analytic OKLCH palettes, subdued derived dark secondary colors and alpha neutrals. Theme Light/Dark, Semantic Base/Canvas/Raised/Floating and Borders Off/On inherit independently. Semantic aliases Theme aliases Primitives; shared roles are deduplicated across surfaces.'};
const json=async(path,v)=>writeFile(path,JSON.stringify(v,null,2)+'\n');
await mkdir('src/tokens',{recursive:true});
await json('src/tokens/figma-modes.json',graph);
await json('src/tokens/palettes.json',palette);
await json('src/tokens/derived.json',secondaryPrimitives);
await json('src/tokens/accents.json',Object.fromEntries(hues.map(h=>[h,Object.fromEntries(scales[h].map(p=>[p.name.split('/').at(-1),hex(p.color)]))])));
await json('src/tokens/neutral.json',Object.fromEntries(scales.neutral.map(p=>[p.name,{$type:'color',$value:p.color}])));
for(const theme of themes)await json('src/tokens/'+theme.toLowerCase()+'.json',Object.fromEntries(Object.entries(semantic[theme+' · Base']).map(([n,v])=>[n,{$type:metadata['Semantic/'+n].type==='FLOAT'?'number':'color',$value:'{'+v.alias.replaceAll('/','.')+'}'}])));
await json('src/tokens/foundations.json',Object.fromEntries(Object.entries(prim).filter(([n])=>/^(number|font)\//.test(n)).map(([n,v])=>[n,{$type:metadata['Primitives/'+n].type,$value:v}])));
await json('src/tokens/surfaces.json',Object.fromEntries(surfaces.map(s=>[s,{palette:surfaceRules[s].palette,background:themes.map((_,i)=>hex(palette['palette/'+surfaceRules[s].palette[i]]))}])));
await json('src/tokens/element-states.json',audit);
const colorCSS=c=>{const rgb=c.components.map(x=>+(x*255).toFixed(8)).join(' ');return c.alpha===1?`rgb(${rgb})`:`rgb(${rgb} / ${c.alpha})`;};
const resolve=(path,mode,seen=[])=>{if(seen.includes(path))throw Error('Alias cycle '+path);const c=path.startsWith('Primitives/')?prim:semantic[mode],key=path.slice(path.indexOf('/')+1),v=c[key];if(v===undefined)throw Error('Missing '+path);return v.alias?resolve(v.alias,mode,[...seen,path]):v;};
const sourceRef=(path,mode)=>{const key=path.slice(path.indexOf('/')+1);return path.startsWith('Primitives/')?`var(${cssName(key)})`:sourceRef(semantic[mode][key].alias,mode);};
let css='/* Generated from the independently authored Sloy UI foundation. See source/foundation.json. */\n:root { color-scheme: light; }\n[data-theme="light"] { color-scheme: light; }\n[data-theme="dark"] { color-scheme: dark; }\n:root {\n';
for(const [n,v]of Object.entries(prim)){const m=metadata['Primitives/'+n];css+=`  ${cssName(n)}: ${m.type==='COLOR'?(alphaPrimitives[n]?`color-mix(in srgb, var(--cap-palette-${alphaPrimitives[n].neutral}) calc(var(--cap-number-opacity-${alphaPrimitives[n].step}) * 1%), transparent)`:colorCSS(v)):m.type==='STRING'?JSON.stringify(v):v+(m.unit==='number'?'':m.unit||'')};\n`;}
for(const [old,name]of Object.entries(legacyNames))if(!old.startsWith('el-')&&cssName(name)!=='--cap-'+old)css+=`  --cap-${old}: var(${cssName(name)});\n`;
for(const [name,value]of Object.entries(foundation.shadows))css+=`  --cap-shadow-${name}: ${value};\n`;
css+='  --cap-ease-standard: cubic-bezier(.2,0,0,1);\n  --cap-ease-out: cubic-bezier(.16,1,.3,1);\n}\n';
// Each context axis is inherited separately. The 0/100% color-mix operations
// below route one exact palette alias; they never blend intermediate shades.
for(const surface of surfaces)css+=`${surface==='base'?':root, ':''}[data-surface="${surface}"] { --cap-is-canvas: ${surface==='canvas'?100:0}%; --cap-is-raised: ${surface==='raised'?100:0}%; --cap-is-floating: ${surface==='floating'?100:0}%; }\n`;
const runtimeNames=Object.keys(Object.values(contexts)[0].values);
for(const hue of hues){const selector=hue==='neutral'?':root, [data-accent="neutral"], [data-color="neutral"], [data-accent="gray"], [data-color="gray"]':`[data-accent="${hue}"], [data-color="${hue}"]`;css+=selector+' {\n';css+=`  --cap-accent-swatch: light-dark(var(--cap-palette-${hue==='neutral'?'gray-500':hue+'-450'}), var(--cap-selected-action-base-normal));\n`;for(const surface of surfaces){for(const kind of ['element','action','action-vivid'])for(const role of [...states,'text','disabled-text','border','border-hover','border-pressed']){const name=`${kind}/${hue}/${role}`;if(!runtimeNames.includes(name))continue;css+=`  --cap-selected-${kind}-${surface}-${role}: light-dark(${sourceRef('Semantic/'+name,'Light · '+surface[0].toUpperCase()+surface.slice(1))}, ${sourceRef('Semantic/'+name,'Dark · '+surface[0].toUpperCase()+surface.slice(1))});\n`;}}css+='}\n';}
css+=':root, [data-theme], [data-accent], [data-color], [data-surface], [data-borders], [data-shadow] {\n';
const route=(values)=>`color-mix(in srgb, ${values.floating} var(--cap-is-floating), color-mix(in srgb, ${values.canvas} var(--cap-is-canvas), color-mix(in srgb, ${values.raised} var(--cap-is-raised), ${values.base})))`;
for(const name of runtimeNames.filter(n=>!n.startsWith('element/')&&!n.startsWith('action/')&&!n.startsWith('action-vivid/'))){const values=Object.fromEntries(surfaces.map(s=>[s,`light-dark(${sourceRef('Semantic/'+name,'Light · '+s[0].toUpperCase()+s.slice(1))}, ${sourceRef('Semantic/'+name,'Dark · '+s[0].toUpperCase()+s.slice(1))})`]));css+=`  ${cssName(name)}: ${route(values)};\n`;}
for(const kind of ['element','action','action-vivid'])for(const role of [...states,'text','disabled-text','border','border-hover','border-pressed']){if(kind!=='element'&&['disabled','disabled-text','border','border-hover','border-pressed'].includes(role))continue;css+=`  --cap-${kind==='element'?'accent':kind==='action'?'accent-solid':'accent-vivid'}-${role}: ${route(Object.fromEntries(surfaces.map(s=>[s,`var(--cap-selected-${kind}-${s}-${role})`])))};\n`;}
for(const role of ['normal','hover','pressed','text']){const name='action/neutral/'+role;css+=`  --cap-action-${role}: light-dark(${sourceRef('Semantic/'+name,'Light · Base')}, ${sourceRef('Semantic/'+name,'Dark · Base')});\n`;}
for(const [role,layers]of Object.entries(elevation)){css+=`  --cap-shadow-${role}: `+layers.map((_,i)=>['x','y','blur','spread'].map(f=>f==='blur'?`calc(var(--cap-number-elevation-${role}-${i?'ambient':'contact'}-${f}) * var(--cap-shadow-blur-scale))`:`var(--cap-number-elevation-${role}-${i?'ambient':'contact'}-${f})`).join(' ')+` light-dark(var(--cap-effect-shadow-${i?'ambient':'contact'}-Light), var(--cap-effect-shadow-${i?'ambient':'contact'}-Dark))`).join(', ')+`;\n`;}
for(const role of ['normal','hover','pressed','base'])css+=`  --cap-reaction-${role}: ${role.endsWith('opacity')?`light-dark(${sourceRef('Semantic/reaction/'+role,'Light · Base')}, ${sourceRef('Semantic/reaction/'+role,'Dark · Base')})`:`light-dark(${sourceRef('Semantic/reaction/'+role,'Light · Base')}, ${sourceRef('Semantic/reaction/'+role,'Dark · Base')})`};\n`;
css+='  --cap-overlay-dim: light-dark(var(--cap-effect-overlay-Light), var(--cap-effect-overlay-Dark));\n';
// Stable public semantic aliases keep consumers small while Figma exposes explicit roles.
const compat={
 'control-bg':'control-normal','control-active':'control-pressed','accent-bg':'accent-normal','accent-soft':'accent-normal','accent-block':'accent-hover','accent-ink':'accent-text','accent-solid':'accent-solid-normal','accent-on-solid':'accent-solid-text',
 'action-solid':'action-normal','action-on-solid':'action-text',
 'bg-base':'surface-base','bg-back':'surface-canvas','bg-front':'surface-raised','bg-el':'control-pressed','bg-el-strong':'control-pressed','bg-el-subtle':'control-normal','bg-base-hover':'control-hover','bg-back-hover':'control-hover','bg-front-hover':'control-hover','bg-el-hover':'control-hover','bg-el-active':'control-pressed','bg-el-subtle-hover':'control-hover','bg-el-subtle-active':'control-pressed','bg-input':'control-normal','bg-input-hover':'control-hover','bg-input-active':'control-pressed',
 'text-primary':'content-primary','text-secondary':'content-secondary','text-muted':'content-muted','text-subtle':'content-muted','input-placeholder':'content-muted',
 'bg-button-primary':'action-normal','bg-button-primary-hover':'action-hover','text-button-primary':'action-text','text-button-primary-hover':'action-text','border-button-primary':'action-normal','border-button-primary-hover':'action-hover',
 'border-base':'panel-border','border-back':'panel-border','border-front':'panel-border','border-el-subtle':'control-border','border-base-strong':'control-border-strong','border-back-strong':'control-border-strong','border-front-strong':'control-border-strong','border-el':'control-border-strong','border-el-hover':'focus-ring','border-el-subtle-hover':'control-border-strong','border-state-active':'focus-ring','ring-state-active':'focus-ring',
 'counter-white-background':'palette-white','counter-white-text':'palette-black','counter-black-background':'palette-black','counter-black-text':'palette-white',
 'code-bg':'surface-current','code-border':'panel-border','code-text':'content-primary','bg-text-selection':'accent-pressed',
};
for(const [old,n]of Object.entries(compat))css+=`  --cap-${old}: var(--cap-${n});\n`;
for(const tone of ['danger','success','warning','info'])for(const [old,n]of Object.entries({bg:'normal',hover:'hover',pressed:'pressed',text:'text'}))css+=`  --cap-status-${tone}-${old}: var(--cap-feedback-${tone}-${n});\n`;
for(const [name,role]of Object.entries({'panel-border':'border-panel','overlay-border':'border-overlay','control-border':'border-control','control-border-hover':'border-control-hover','control-border-pressed':'border-control-pressed','control-border-strong':'border-strong','accent-outline':'accent-border','accent-outline-hover':'accent-border-hover','accent-outline-pressed':'accent-border-pressed'}))css+=`  --cap-${name}: color-mix(in srgb, var(--cap-${role}) var(--cap-outline-opacity), transparent);\n`;
css+='}\n';
css+=':root, [data-theme="light"] { --cap-reaction-hover-opacity: calc(var(--cap-number-opacity-04) / 100); --cap-reaction-pressed-opacity: calc(var(--cap-number-opacity-08) / 100); }\n[data-theme="dark"] { --cap-reaction-hover-opacity: calc(var(--cap-number-opacity-06) / 100); --cap-reaction-pressed-opacity: calc(var(--cap-number-opacity-10) / 100); }\n';
css=':root, [data-shadow=\"soft\"] { --cap-shadow-blur-scale:1; }\n[data-shadow=\"compact\"] { --cap-shadow-blur-scale:.55; }\n:root, [data-borders="off"] { --cap-outline-opacity: 0%; }\n[data-borders="on"] { --cap-outline-opacity: 100%; }\n'+css;
css+=':root, [data-borders="off"] { --cap-code-fill-opacity:100%; }\n[data-borders="on"] { --cap-code-fill-opacity:0%; }\n';
// Radius is a separate inherited context, independent of color and surface.
css+=':root { --cap-radius-scale:var(--cap-number-radius-scale-default); --cap-radius-inset:var(--cap-number-radius-inset-default); --cap-radius-segmented:var(--cap-radius-xl); }\n';
for(const mode of ['compact','default','rounded'])css+=`[data-radius="${mode}"] { --cap-radius-scale:var(--cap-number-radius-scale-${mode}); --cap-radius-inset:var(--cap-number-radius-inset-${mode}); --cap-radius-segmented:var(${mode==='rounded'?'--cap-radius-full':'--cap-radius-xl'}); }\n`;
css+=':root, [data-radius] {\n';
for(const [name,value] of Object.entries(prim).filter(([name])=>name.startsWith('number/radius/')&&!name.endsWith('/full')))css+=`  ${cssName(name)}:calc(${value}px * var(--cap-radius-scale,1));\n`;
for(const [old,name]of Object.entries(legacyNames))if(name.startsWith('number/radius/')&&cssName(name)!=='--cap-'+old)css+=`  --cap-${old}:var(${cssName(name)});\n`;
css+='}\n';
await writeFile('src/styles/tokens.css',css);
await json('src/tokens/catalog.json',runtimeNames.filter(n=>!n.startsWith('element/')&&!n.startsWith('action/')&&!n.startsWith('action-vivid/')).map(name=>({name:cssName(name),original:name,group:name.split('/')[0],light:hex(resolve('Semantic/'+name,'Light · Base')),dark:hex(resolve('Semantic/'+name,'Dark · Base')),runtime:true})));
const minContrast=Math.min(...audit.map(r=>r.contrast));
await json('docs/token-validation.json',{version,foundationSource:foundation.authoring.name,paletteColors:Object.keys(palette).length,derivedSecondaryColors:Object.keys(secondaryPrimitives).length,accentSteps:22,graySteps:41,accentModes:18,contexts:Object.keys(contexts).length,states,figmaCollections:graph.collections.length,figmaVariables:graph.collections.reduce((n,c)=>n+Object.keys(Object.values(c.modes)[0]).length,0),secondaryCombinations:audit.length,minTextContrast:minContrast,minReactionContrast:Math.min(...audit.map(r=>r.reactionContrast)),crossCollectionAliases:true});
await mkdir('artifacts/figma-library',{recursive:true});
await json('artifacts/figma-library/token-migration-graph.json',graph);
console.log(`Full palette model: ${Object.keys(palette).length} colors, ${audit.length} secondary pairs, min text contrast ${minContrast.toFixed(3)}:1, independent Theme, Semantic surface and Borders modes.`);
