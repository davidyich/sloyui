import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const ids=JSON.parse(fs.readFileSync(option('--ids','artifacts/figma-refinement/app-map.json'),'utf8'));
const setsPath=option('--sets',null);if(setsPath){const report=JSON.parse(fs.readFileSync(setsPath,'utf8'));ids.sloy=Object.fromEntries(Object.entries(report.sloySets||report).map(([name,value])=>[name,typeof value==='string'?value:value?.id]));}
const layoutSource=fs.readFileSync(path.join(dir,'sloy-layouts.js'),'utf8');
if(setsPath){
  // Keep dependencies tied to the actual layout calls, including helper-created buttons.
  const componentNames=new Set([...layoutSource.matchAll(/\bsinstance\([^,]+,\s*'([^']+)'/g)].map(match=>match[1]));
  if(/\bsiconButton\(/.test(layoutSource))componentNames.add('iconButtonGhost');
  const iconNames=new Set([...layoutSource.matchAll(/\b(?:sicon|siconButton)\([^,]+,\s*'([^']+)'|\bsiconId\(\s*'([^']+)'/g)].map(match=>match[1]||match[2]));
  const validId=value=>typeof value==='string'&&value.trim().length>0;
  const missing=[...componentNames].filter(name=>!validId(ids.sloy?.[name]||ids.components?.[name]||ids.controls?.[name])).map(name=>'component '+name);
  missing.push(...[...iconNames].filter(name=>!validId(ids.icons?.[name])).map(name=>'icon '+name));
  if(missing.length)throw Error('Layouts dependency preflight failed: '+missing.join(', '));
}
const sourceRoot=option('--sloy','/Users/davidov/AI/PROJECTS/sloy');
const date=option('--date','2026-10-23');const parsed=new Date(date+'T12:00:00+03:00');const monday=new Date(parsed);monday.setUTCDate(parsed.getUTCDate()-(parsed.getUTCDay()+6)%7);
const docs=['DESIGN.md','docs/PLAN.md','docs/CONTRACTS.md'].map(file=>{const markdown=fs.readFileSync(path.join(sourceRoot,file),'utf8');const heading=markdown.split('\n').find(line=>/^# /.test(line)).slice(2);const paragraphs=markdown.split(/\n\s*\n/).map(p=>p.trim()).filter(p=>p&&!p.startsWith('#'));return{path:file,title:heading,excerpt:paragraphs[0].replace(/\n/g,' '),body:paragraphs.slice(0,2).join('\n\n')};});
const data={date,dateLabel:new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'long',weekday:'long'}).format(parsed),weekDays:Array.from({length:7},(_,i)=>{const value=new Date(monday);value.setUTCDate(monday.getUTCDate()+i);return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric'}).format(value);}),selectedWeekDay:String((parsed.getUTCDay()+6)%7+1),materialExcerpt:docs[0].excerpt,materialBody:docs[0].body,noteExcerpt:docs[0].excerpt,materials:docs,tasks:[{title:'Проверить сохранение материала',description:'Оригинал и происхождение сохраняются до подтверждения приёма.',meta:'Сегодня · План приёмки'},{title:'Проверить восстановление черновика',meta:'Без срока · План приёмки'},{title:'Проверить клавиатурную навигацию',meta:'Без срока · План приёмки'}]};
const common=fs.readFileSync(path.join(dir,'common.js'),'utf8');const helper=fs.readFileSync(path.join(dir,'sloy-helper.js'),'utf8');const variants=fs.readFileSync(path.join(dir,'variant-helper.js'),'utf8');const prelude='const SLOY_IDS = '+JSON.stringify(ids)+';\nconst SLOY_DATA = '+JSON.stringify(data)+';\n';
const out=path.resolve(option('--out','artifacts/figma-refinement/sloy'));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const names=setsPath?['sloy-components','sloy-layouts']:['sloy-components'];
const scripts=names.map(name=>{const code=common+'\n'+prelude+helper+'\n'+(name==='sloy-components'?variants:'')+'\n'+(name==='sloy-layouts'?layoutSource:fs.readFileSync(path.join(dir,name+'.js'),'utf8'));new AsyncFunction(code);if(Buffer.byteLength(code)>50000)throw Error(name+' exceeds 50 KB');return[name+'.js',code];});
fs.mkdirSync(out,{recursive:true});
for(const[name,code]of scripts)fs.writeFileSync(path.join(out,name),code);
fs.writeFileSync(path.join(out,'sample-data.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({out,date,scripts:scripts.map(([name])=>name),layoutDependenciesReady:Boolean(setsPath),iconsReady:Boolean(ids.icons?.Heart),sampleSource:sourceRoot}));
