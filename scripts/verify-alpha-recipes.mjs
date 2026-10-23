// Independent rendered-color acceptance. Thresholds intentionally do not import solver policy.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const acceptance=Object.freeze({textContrast:4.5,stateContrast:1.06,stateDeltaMinimum:.015,stateDeltaMaximum:.05,tertiaryContrast:1.10,secondaryContrast:1.30,tertiaryDelta:.025,secondaryDelta:.06});
const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
export function composite(f,b){const a=f.a??1;return {r:f.r*a+b.r*(1-a),g:f.g*a+b.g*(1-a),b:f.b*a+b.b*(1-a),a:1};}
export const luminance=c=>.2126*linear(c.r)+.7152*linear(c.g)+.0722*linear(c.b);
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function lab(c){const r=linear(c.r),g=linear(c.g),b=linear(c.b),l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];}
export const delta=(a,b)=>{const x=lab(a),y=lab(b);return Math.hypot(...x.map((n,i)=>n-y[i]));};
const hex=s=>{const n=parseInt(s.slice(1),16);return {r:(n>>16)/255,g:((n>>8)&255)/255,b:(n&255)/255,a:1};};
const black=hex('#000000'),white=hex('#FFFFFF'),soft=['tertiary/normal','tertiary/active','secondary/normal','secondary/active'];
const signature=c=>[c.r,c.g,c.b].map(n=>n.toFixed(9)).join(',');
const epsilon=1e-7;
function meter(){return {checks:0,failures:0,minimum:Infinity,maximum:-Infinity,worst:null,examples:[],failureKeys:[]};}
function record(m,value,min,max,where){m.checks++;m.minimum=Math.min(m.minimum,value);m.maximum=Math.max(m.maximum,value);if(!m.worst||value<m.worst.value)m.worst={value,...where};if(!Number.isFinite(value)||value<min-epsilon||value>max+epsilon){m.failures++;const failure={value,min,max:Number.isFinite(max)?max:null,...where};m.failureKeys.push(JSON.stringify(where));if(m.examples.length<24)m.examples.push(failure);}}
function suite(){return {contexts:0,text:meter(),stateContrast:meter(),stateDelta:meter(),fillContrast:meter(),fillDelta:meter(),hierarchy:meter(),wholePercent:meter(),pigmentMembership:meter(),pigments:{},qualitySamples:[],stressText:meter(),primaryText:meter(),coverage:[]};}
function paintChecks(s,where,backing,fills,inks){
 const rendered=Object.fromEntries(soft.map(role=>[role,composite(fills[role],backing)]));
 if(where.layer==='bg')for(const role of soft){const rgb=rendered[role],ok=lab(rgb),chroma=Math.hypot(ok[1],ok[2]);s.qualitySamples.push({where:{...where,role},rgb,lab:ok,chroma,hue:(Math.atan2(ok[2],ok[1])*180/Math.PI+360)%360,effectiveTheme:contrast(black,backing)>=contrast(white,backing)?'Light':'Dark',alpha:fills[role].a??1,pigment:signature(fills[role]),backing,contributionHue:(Math.atan2(ok[2]-lab(backing)[2],ok[1]-lab(backing)[1])*180/Math.PI+360)%360,contributionChroma:Math.hypot(ok[1]-lab(backing)[1],ok[2]-lab(backing)[2])});}
 for(const [role,ink]of Object.entries(inks)){
  record(s.text,contrast(composite(ink,backing),backing),acceptance.textContrast,Infinity,{...where,role,on:'backing'});
  for(const fill of soft)record(s.text,contrast(composite(ink,rendered[fill]),rendered[fill]),acceptance.textContrast,Infinity,{...where,role,on:fill});
 }
 for(const family of ['tertiary','secondary']){
  const a=rendered[family+'/normal'],b=rendered[family+'/active'];
  record(s.stateContrast,contrast(a,b),acceptance.stateContrast,Infinity,{...where,family});record(s.stateDelta,delta(a,b),acceptance.stateDeltaMinimum,acceptance.stateDeltaMaximum,{...where,family});
  for(const state of ['normal','active']){const role=family+'/'+state;record(s.fillContrast,contrast(rendered[role],backing),acceptance[family+'Contrast'],Infinity,{...where,role});record(s.fillDelta,delta(rendered[role],backing),acceptance[family+'Delta'],Infinity,{...where,role});}
 }
 const ratios=soft.map(role=>contrast(rendered[role],backing));for(let i=1;i<ratios.length;i++)record(s.hierarchy,ratios[i]-ratios[i-1],.000001,Infinity,{...where,between:soft[i-1]+' -> '+soft[i]});
 for(const [role,paint]of Object.entries(fills).filter(([r])=>soft.includes(r))){record(s.wholePercent,Math.abs((paint.a??1)*100-Math.round((paint.a??1)*100)),0,1e-8,{...where,role});(s.pigments[where.hue]??=new Set()).add(signature(paint));}
}
const expandedLayers=(base,paints)=>{
 const result=[{name:'bg',base,layer:'bg'}];for(const [name,paint]of Object.entries(paints))if(paint)result.push({name,base:composite(paint,base),layer:name});
 if(paints.block){const block=composite(paints.block,base);result.push({name:'block/block',base:composite(paints.block,block),layer:'block'});for(const name of ['control/normal','control/active','disabled'])if(paints[name])result.push({name:'block/'+name,base:composite(paints[name],block),layer:name});}
 if(paints['control/normal'])result.push({name:'control/normal/control/normal',base:composite(paints['control/normal'],composite(paints['control/normal'],base)),layer:'control/normal'});
 return result;
};
function nativeAudit(graph){
 const s=suite();s.studyStateDelta=meter();s.studyStateContrast=meter();const map=new Map(graph.collections.flatMap(c=>c.variables.map(v=>[c.key+'/'+v.name,{c,v}])));
 const resolve=(key,axes)=>{const t=map.get(key);if(!t)throw Error('Missing native '+key);const v=t.v.values[axes[t.c.key]??t.c.modes[0]];return v?.alias?resolve(v.alias,axes):v;};
 const axes=graph.axes??Object.fromEntries(graph.collections.map(c=>[c.key,c.modes]));const hues=graph.accents;
 for(const theme of axes.theme)for(const scheme of axes.scheme)for(const surface of axes.surface){const context={theme,scheme,surface},get=r=>resolve('surface/'+r,context),bg=get('surface/bg');s.contexts++;
  const bases=(bg.a??1)<1?[composite(bg,black),composite(bg,white)]:[bg];
  for(const [extreme,base]of bases.entries())for(const layer of expandedLayers(base,{block:get('surface/block'),'control/normal':get('surface/tertiary/normal'),'control/active':get('surface/tertiary/active'),'neutral/secondary/normal':get('surface/secondary/normal'),'neutral/secondary/active':get('surface/secondary/active'),disabled:get('surface/disabled')})){
   for(const hue of hues){if(layer.name==='bg')for(const state of ['normal','active']){const fill=composite(get(`surface/accent/${hue}/primary/${state}`),layer.base),ink=get(`content/accent/${hue}/on-primary`);record(s.primaryText,contrast(composite(ink,fill),fill),acceptance.textContrast,Infinity,{...context,hue,extreme,role:'on-primary',on:'primary/'+state});}const fills=Object.fromEntries(soft.map(role=>{const [family,state]=role.split('/');return [role,get(`surface/accent/${hue}/${family}/${state}`)];}));paintChecks(s,{...context,hue,layer:layer.name,extreme},layer.base,fills,{primary:get('content/accent/'+hue+'/primary'),secondary:get('content/accent/'+hue+'/secondary')});if(['bg','block','control/normal','control/active','neutral/secondary/normal','neutral/secondary/active'].includes(layer.name))for(const family of ['tertiary','secondary']){const a=composite(fills[family+'/normal'],layer.base),b=composite(fills[family+'/active'],layer.base),where={...context,hue,layer:layer.name,extreme,family};record(s.studyStateDelta,delta(a,b),acceptance.stateDeltaMinimum,acceptance.stateDeltaMaximum,where);record(s.studyStateContrast,contrast(a,b),acceptance.stateContrast,Infinity,where);}}
   for(const role of ['primary','secondary','muted','disabled']){const ink=get('content/'+role);record(role==='disabled'&&!['bg','block','disabled','block/block','block/disabled'].includes(layer.name)?s.stressText:s.text,contrast(composite(ink,layer.base),layer.base),acceptance.textContrast,Infinity,{...context,hue:'neutral',layer:layer.name,extreme,role,on:'backing'});}
  }
 }
 s.coverage.push('Exact native exported bg/block/control/disabled plus block-block, block-control, block-disabled and repeated neutral-control composition.');return s;
}
const appearanceFailures=s=>['stateContrast','stateDelta','fillContrast','fillDelta','hierarchy'].reduce((n,k)=>n+s[k].failures,0);
async function modelAudit(root,{hues,customs,progress}){
 const s=suite(),stress=suite();s.contextOutcomes=[];
 const module=await import(pathToFileURL(path.join(root,'figma/color-system-v2/editor/model.mjs')).href),source=JSON.parse(fs.readFileSync(path.join(root,'figma/color-system-v2/source.json'))),resolved=JSON.parse(fs.readFileSync(path.join(root,'figma/token-system-v4/palette-contexts.json')));
 const rules={...module.defaultRules,balanceSecondary:true},neutral=module.createNeutralSystem(),specs=[];
 for(const theme of ['Light','Dark'])for(const scheme of ['Standard','Dimmed'])for(const surface of ['Shell','Workspace','Content','Overlay','Invert','Glass'])specs.push({theme,scheme,surface});
 for(const custom of customs)for(const theme of ['Light','Dark'])for(const scheme of ['Standard','Dimmed'])specs.push({theme,scheme,surface:'Custom',custom});
 for(const preset of module.presets.filter(p=>!hues||hues.includes(p.name))){const accent=module.createAccent(preset.name,preset.hex);accent.id='verify-'+preset.name;const palette=module.generatePalette(accent,rules);
  for(const spec of specs){const {theme,scheme,surface,custom}=spec,customMap=custom?{Light:custom,Dark:custom}:undefined,c=module.generateContext(accent,theme,scheme,surface,source,resolved,customMap,rules,palette,surface,neutral);s.contexts++;
   const beforeText=s.text.failures,beforeAppearance=appearanceFailures(s);
   const declaredPigments=new Set(palette[0].steps.map(step=>signature(step.value)));for(const role of soft)record(s.pigmentMembership,declaredPigments.has(signature(c.fills[role]))?1:0,1,1,{...spec,hue:preset.name,role});
   if(custom)for(const key of ['r','g','b'])assert.equal(c.bg[key],hex(custom)[key],'Custom background was changed');
   const bases=(c.bg.a??1)<1?[composite(c.bg,black),composite(c.bg,white)]:[c.bg];
   const backdrop=module.resolveContextBackings?.(theme,scheme,surface,source,resolved,customMap,rules,neutral);
   for(const [extreme,base]of bases.entries()){
    const paints=c.neutral,block=composite(paints['secondary/normal'],base),layers=[{name:'bg',base,layer:'bg'},...Object.entries(paints).map(([name,paint])=>({name,layer:name,base:composite(paint,base)})),...Object.entries(paints).map(([name,paint])=>({name:'secondary/normal/'+name,layer:name+'/on-block',fallback:name,base:composite(paint,block)}))];
    // Disabled paint is exposed by the new model's backing contract. Legacy models
    // omit it; exact legacy disabled coverage remains in the separate native audit.
    if(backdrop)for(const item of backdrop.backings.filter(b=>b.extreme===extreme&&b.name.startsWith('disabled')))layers.push({name:item.name,layer:item.name,base:item.base});
    const apply=(target,layer)=>paintChecks(target,{...spec,hue:preset.name,layer:layer.name,extreme},layer.base,{...c.fills,...(c.layerFills?.[layer.layer]??c.layerFills?.[layer.fallback])},{primary:c.content.primary,secondary:c.content.secondary});
    for(const layer of layers)apply(s,layer);
    // Repeated active/tertiary layers are retained as stress evidence. They are not
    // the declared block-preserving Card -> local-control composition contract.
    for(const [outer,paint]of Object.entries(paints).filter(([name])=>name!=='secondary/normal'))for(const inner of ['tertiary/normal','secondary/normal'])apply(stress,{name:outer+'/'+inner,layer:inner,base:composite(paints[inner],composite(paint,base))});
    for(const state of ['normal','active']){const fill=composite(c.fills['primary/'+state],base);record(s.text,contrast(composite(c.content['on-primary'],fill),fill),acceptance.textContrast,Infinity,{...spec,hue:preset.name,extreme,role:'on-primary',on:'primary/'+state});}
   }
   const diagnostics=Object.values(c.balanceDiagnostics??{}),explicitLimited=diagnostics.some(d=>d.limited===true&&Array.isArray(d.issues)&&d.issues.length>0),textFailures=s.text.failures-beforeText,appearance=appearanceFailures(s)-beforeAppearance;
   s.contextOutcomes.push({...spec,hue:preset.name,textFailures,appearanceFailures:appearance,explicitLimited,diagnostics:[...new Set(diagnostics.flatMap(d=>d.issues??[]))],status:textFailures?'blocked-text':appearance?(custom&&explicitLimited?'custom-limited':'blocked-appearance'):'pass'});
   if(progress&&s.contexts%12===0)process.stderr.write(`alpha verifier: ${s.contexts} generated contexts\n`);
  }
 }
 s.stress=finish(stress);s.coverage.push('Supported: actual neutral layers, block -> local controls, both Glass underlays; model-exposed disabled on bg/block.');s.coverage.push('Repeated active/tertiary layers remain in stress with unchanged thresholds; they do not silently enter the supported composition contract.');return s;
}
function finish(s){s.pigments=Object.fromEntries(Object.entries(s.pigments).map(([hue,values])=>[hue,values.size]));s.totalFailures=Object.entries(s).filter(([k,v])=>k!=='stressText'&&!k.startsWith('study')&&v&&typeof v==='object'&&'failures'in v).map(([,v])=>v).reduce((n,v)=>n+v.failures,0);s.strictResult=s.totalFailures?'fail':'pass';s.result=s.strictResult;if(s.contextOutcomes){const blocked=s.contextOutcomes.filter(c=>c.status.startsWith('blocked')),limited=s.contextOutcomes.filter(c=>c.status==='custom-limited');s.acceptanceSummary={blockedContexts:blocked.length,customLimitedContexts:limited.length,customLimited:limited,coreContexts:s.contextOutcomes.filter(c=>!c.custom).length};s.result=blocked.length||s.wholePercent.failures||s.pigmentMembership.failures?'fail':limited.length?'pass-with-custom-limits':'pass';}return s;}
function compareQuality(before,after){
 const key=s=>JSON.stringify(s.where),old=new Map(before.map(s=>[key(s),s])),paired=after.filter(s=>old.has(key(s))).map(s=>({before:old.get(key(s)),after:s}));
 const median=values=>{const a=[...values].sort((x,y)=>x-y);return a.length?(a.length%2?a[Math.floor(a.length/2)]:(a[a.length/2-1]+a[a.length/2])/2):null;};
 const hues=[...new Set(paired.map(p=>p.after.where.hue))];
 const perHue=Object.fromEntries(hues.map(hue=>{const ps=paired.filter(p=>p.after.where.hue===hue&&p.after.where.role==='secondary/normal'&&p.after.effectiveTheme==='Light'&&!p.after.where.custom),a=ps.map(p=>p.before.chroma),b=ps.map(p=>p.after.chroma);return [hue,{samples:ps.length,before:{minimum:Math.min(...a),median:median(a),maximum:Math.max(...a),targetError:median(a.map(c=>Math.abs(c-.06)))},after:{minimum:Math.min(...b),median:median(b),maximum:Math.max(...b),targetError:median(b.map(c=>Math.abs(c-.06)))},medianChromaChange:median(b)-median(a),medianColorDelta:median(ps.map(p=>delta(p.before.rgb,p.after.rgb))),maximumColorDelta:Math.max(...ps.map(p=>delta(p.before.rgb,p.after.rgb)))}];}));
 const groups=new Map();for(const p of paired.filter(p=>p.after.where.role==='secondary/normal')){const w={...p.after.where};delete w.hue;const k=JSON.stringify(w);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);}
 const pairwise=[];for(const [context,ps]of groups)for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i],b=ps[j];if(a.after.where.hue===b.after.where.hue)continue;const beforeDelta=delta(a.before.rgb,b.before.rgb),afterDelta=delta(a.after.rgb,b.after.rgb);pairwise.push({context:JSON.parse(context),hues:[a.after.where.hue,b.after.where.hue],beforeDelta,afterDelta,change:afterDelta-beforeDelta});}
 return {criterion:'Human color-quality acceptance remains separate from numeric visibility pass. Compare Light target C=.06 and pairwise hue distinction; pigment savings never override it.',perHue,pairwise,largestColorChanges:paired.map(p=>({where:p.after.where,delta:delta(p.before.rgb,p.after.rgb),beforeRGB:p.before.rgb,afterRGB:p.after.rgb,beforeChroma:p.before.chroma,afterChroma:p.after.chroma,beforeHue:p.before.hue,afterHue:p.after.hue,beforeContributionHue:p.before.contributionHue,afterContributionHue:p.after.contributionHue})).sort((a,b)=>b.delta-a.delta).slice(0,24),desaturationFlags:Object.entries(perHue).filter(([,p])=>p.medianChromaChange<0).map(([hue,p])=>({hue,...p}))};
}
function qualitySVG(before,after){
 const old=before.domains.native?.qualitySamples??[],now=after.domains.native?.qualitySamples??[],hues=['blue','green','orange','red','pink','purple'],rows=['Light','Dark'].flatMap(theme=>soft.map(role=>({theme,role}))),width=1120,height=96+rows.length*118;
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');const rgb=c=>'rgb('+[c.r,c.g,c.b].map(n=>Math.round(n*255)).join(',')+')';
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f4f4f4"/><g font-family="Inter,Arial,sans-serif" font-size="12" fill="#171717"><text x="20" y="26" font-size="18">Exact native Content / Standard — baseline → current</text><text x="20" y="48">Rendered colors after alpha compositing. Each pair: baseline left, current right. C = OKLCH chroma.</text>`;
 for(let i=0;i<hues.length;i++)svg+=`<text x="${160+i*158}" y="78" font-weight="600">${hues[i]}</text>`;
 for(let row=0;row<rows.length;row++){const {theme,role}=rows[row],y=94+row*118;svg+=`<text x="16" y="${y+22}">${theme}</text><text x="16" y="${y+42}">${escape(role)}</text>`;
  for(let col=0;col<hues.length;col++){const match=s=>s.where.theme===theme&&s.where.scheme==='Standard'&&s.where.surface==='Content'&&s.where.hue===hues[col]&&s.where.role===role&&s.where.layer==='bg';const a=old.find(match),b=now.find(match);if(!a||!b)continue;
   for(const [side,sample]of [a,b].entries()){const x=152+col*158+side*74,ink=contrast(black,sample.rgb)>=contrast(white,sample.rgb)?'#000':'#fff';svg+=`<rect x="${x}" y="${y}" width="72" height="76" rx="4" fill="${rgb(sample.rgb)}"/><text x="${x+7}" y="${y+24}" fill="${ink}">${side?'new':'old'}</text><text x="${x+7}" y="${y+48}" fill="${ink}">C ${sample.chroma.toFixed(3)}</text>`;}
   svg+=`<text x="${152+col*158}" y="${y+95}">ΔE ${delta(a.rgb,b.rgb).toFixed(3)}</text>`;
  }
 }
 return svg+'</g></svg>';
}
function hash(file){return createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
export async function verify({inputRoot=path.resolve(fileURLToPath(new URL('..',import.meta.url))),out,baseline,domain='both',hues,customs=['#F1EEF8','#221D2C','#E53E3E','#7955F6','#777777','#000000','#FFFFFF','#FF0000','#00FF00','#0000FF','#FFFF00','#00FFFF','#FF00FF'],progress=false,svg,nativeGraphPath}={}){
 assert.equal(contrast(black,white),21);assert.equal(delta(black,black),0);assert.deepEqual(composite({...white,a:.5},black),{r:.5,g:.5,b:.5,a:1});
 const started=Date.now(),graphPath=nativeGraphPath??path.join(inputRoot,'figma/color-system-v2/native-graph.json'),graph=JSON.parse(fs.readFileSync(graphPath));
 const report={schema:'sloy-alpha-acceptance/v1',inputRoot,verifierSHA:hash(fileURLToPath(import.meta.url)),acceptance,thresholdBasis:{text:'Project requirement: normal UI text, including disabled, at least4.5 after compositing.',state:'Existing project fillVisibilityPolicy and frozen alpha-study: OKLab Euclidean .015–.05 and contrast>=1.06. These are state visibility/gentleness criteria, not a WCAG text criterion.',fill:'Existing per-family project visibility floors; never imported from the mutable solver.'},inputs:{},inventory:Object.fromEntries(graph.collections.map(c=>[c.key,c.variables.length])),domains:{},selection:{domain,hues:hues??'all-six',nativeGraphPath:graphPath},customs};
 for(const file of ['figma/color-system-v2/native-graph.json','figma/color-system-v2/editor/model.mjs','figma/color-system-v2/editor/recommended-fills.mjs','figma/color-system-v2/editor/alpha-recipes.mjs','figma/color-system-v2/editor/neutral-system.mjs','figma/color-system-v2/editor/palette-math.mjs','figma/color-system-v2/color-engine.mjs','figma/color-system-v2/source.json','figma/token-system-v4/palette-contexts.json'])if(fs.existsSync(path.join(inputRoot,file)))report.inputs[file]=hash(path.join(inputRoot,file));
 report.inputs['figma/color-system-v2/native-graph.json']=hash(graphPath);
 if(domain!=='model')report.domains.native=finish(nativeAudit(graph));if(domain!=='native')report.domains.model=finish(await modelAudit(inputRoot,{hues,customs,progress}));
 report.durationSeconds=(Date.now()-started)/1000;report.result=Object.values(report.domains).some(s=>s.result==='fail')?'fail':Object.values(report.domains).some(s=>s.result==='pass-with-custom-limits')?'pass-with-custom-limits':'pass';
 if(baseline){const before=JSON.parse(fs.readFileSync(baseline));assert.deepEqual(before.acceptance,acceptance,'Baseline uses different acceptance thresholds');report.comparison={inventoryBefore:before.inventory,inventoryAfter:report.inventory,domains:{}};for(const [name,after]of Object.entries(report.domains)){const old=before.domains[name];if(!old)continue;report.comparison.domains[name]=Object.fromEntries(Object.keys(after).filter(k=>old[k]&&after[k]&&typeof after[k]==='object'&&'failures'in after[k]).map(k=>{const known=new Set(old[k].failureKeys);return [k,{before:old[k].failures,after:after[k].failures,newFailingPairs:after[k].failureKeys.filter(key=>!known.has(key)).length}];}));}}
 if(baseline){const before=JSON.parse(fs.readFileSync(baseline));report.qualityComparison={};for(const [name,after]of Object.entries(report.domains)){const old=before.domains[name];if(!old)continue;report.qualityComparison[name]=compareQuality(old.qualitySamples,after.qualitySamples);}}
 report.numericResult=report.result;
 if(report.qualityComparison){const regressions=Object.entries(report.qualityComparison).flatMap(([domain,q])=>Object.entries(q.perHue).filter(([,v])=>v.medianChromaChange<0&&v.after.targetError>v.before.targetError+1e-12).map(([hue,v])=>({domain,hue,beforeC:v.before.median,afterC:v.after.median,beforeTargetError:v.before.targetError,afterTargetError:v.after.targetError})));report.qualityAcceptance={result:regressions.length?'review-required':'review',basis:'A reduction in Light-effective median chroma that also moves farther from the established C=.06 target is a quality regression; inventory savings cannot override it. The report records every regression continuously; perceptual acceptance remains a separate human review, including hue fidelity and swatches.',regressions};}
 if(svg&&baseline){fs.mkdirSync(path.dirname(svg),{recursive:true});fs.writeFileSync(svg,qualitySVG(JSON.parse(fs.readFileSync(baseline)),report));}
 if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.includes('--help')||args.includes('-h')){console.log(`Usage: node scripts/verify-alpha-recipes.mjs [options]
  --domain native|model|both   Native core or full Palette Lab matrix (default both)
  --input-root PATH           Owning sources root, including a frozen baseline copy
  --native-graph FILE         Read an in-memory exporter artifact instead of core output
  --out FILE                  Structured JSON report (default artifacts/alpha-recipes/current.json)
  --baseline FILE             Compare unchanged thresholds, failure pairs and color quality
  --svg FILE                  Save exact native old/new swatches; requires --baseline
  --hues blue,green,...        Model subset for diagnosis; default all six
  --customs HEX,HEX,...        Model Custom cases; default 13 including exact saturated/extreme RGB
  --help                      Show usage without running checks or writing files
Custom text remains >=4.5. Appearance limitations require explicit solver diagnostics;
raw failures and unsupported nesting stress remain in the JSON report.
Math tests: node --test scripts/verify-alpha-recipes.test.mjs`);}else{const option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};const report=await verify({inputRoot:path.resolve(option('--input-root',fileURLToPath(new URL('..',import.meta.url)))),out:path.resolve(option('--out','artifacts/alpha-recipes/current.json')),baseline:option('--baseline'),domain:option('--domain','both'),svg:option('--svg'),nativeGraphPath:option('--native-graph'),hues:option('--hues')?.split(','),customs:option('--customs')?.split(','),progress:true});
 console.log(JSON.stringify({result:report.result,durationSeconds:report.durationSeconds,inventory:report.inventory,domains:Object.fromEntries(Object.entries(report.domains).map(([k,s])=>[k,{contexts:s.contexts,failures:s.totalFailures,textMinimum:s.text.minimum,stateDeltaMinimum:s.stateDelta.minimum,stateDeltaMaximum:s.stateDelta.maximum,pigments:s.pigments}]))},null,2));process.exitCode=report.result.startsWith('pass')?0:1;}
}
