import fs from 'node:fs';import path from 'node:path';
const args=process.argv.slice(2);const value=(key,fall)=>args.includes(key)?args[args.indexOf(key)+1]:fall;const out=path.resolve(value('--out','artifacts/figma-refinement/sloy'));fs.mkdirSync(out,{recursive:true});
const components=JSON.parse(fs.readFileSync(value('--components','artifacts/figma-refinement/sloy-components-receipt.json'),'utf8'));
const layoutPath=value('--layouts',null);const common=fs.readFileSync('figma/guide/common.js','utf8');const audit=fs.readFileSync('figma/guide/audit-sloy.js','utf8');
fs.writeFileSync(path.join(out,'sloy-accent-delta.js'),common+'\n'+fs.readFileSync('figma/guide/sloy-accent-delta.js','utf8'));
const specs=[['sloy-components-audit',{pageName:'03 · Components',rootIds:[components.root.id],masterIds:Object.values(components.sloySets).map(v=>v.id)}]];
if(layoutPath){const layouts=JSON.parse(fs.readFileSync(layoutPath,'utf8'));specs.push(['sloy-layouts-audit',{pageName:'04 · Layouts',rootIds:[layouts.root.id],masterIds:[]}]);}
for(const[name,spec]of specs)fs.writeFileSync(path.join(out,name+'.js'),'const SLOY_AUDIT='+JSON.stringify(spec)+';\n'+audit);
console.log(JSON.stringify({out,scripts:['sloy-accent-delta.js',...specs.map(([name])=>name+'.js')]}));
