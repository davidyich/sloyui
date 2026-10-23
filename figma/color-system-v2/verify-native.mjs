import fs from 'node:fs';
import { verifyNativeGraph } from './build-native.mjs';
const graph = JSON.parse(fs.readFileSync(new URL('./native-graph.json', import.meta.url)));
console.log(JSON.stringify(verifyNativeGraph(graph), null, 2));
