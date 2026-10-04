import { readFile, writeFile } from 'node:fs/promises';
const graph = JSON.parse(await readFile('src/tokens/figma-modes.json', 'utf8'));
const implementation = await readFile('figma/importer-core.js', 'utf8');
await writeFile('figma/importer/code.js', `${implementation}\nconst graph = ${JSON.stringify(graph)};\nfigma.showUI(__html__, { width: 440, height: 550, themeColors: true });\nfigma.ui.onmessage = async message => {\n if(message.type !== 'import') return;\n try { const result = await importCapacitiesVariables(figma, graph, message.modes); figma.ui.postMessage({type:'success',result}); }\n catch (error) { figma.ui.postMessage({type:'error',message:String(error.message || error)}); }\n};\n`);
console.log('Figma importer generated from the same runtime token graph.');
