import fs from 'node:fs';
const [name, options='{}']=process.argv.slice(2);
const read=n=>fs.readFileSync(new URL(n,import.meta.url),'utf8');
const args=JSON.parse(options);
const constants=Object.entries(args).map(([key,value])=>`const ${key}=${JSON.stringify(value)};`).join('\n');
const iconData=name==='foundations'?`const ICON_SVGS=${read('icons.json')};\n`:'';
console.log(iconData+constants+'\n'+read('common.js')+'\n'+read('variant-helper.js')+'\n'+read(name+'.js'));
