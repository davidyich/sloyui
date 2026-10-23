import fs from 'node:fs';
import { verifyCustomScope } from './export-custom.mjs';
const target = process.argv[2] || new URL('../../artifacts/custom-project/graph.json', import.meta.url);
const result = verifyCustomScope(JSON.parse(fs.readFileSync(target)));
console.log(JSON.stringify(result, null, 2));
if (result.result !== 'pass') process.exitCode = 1;
