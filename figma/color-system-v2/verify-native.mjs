import fs from 'node:fs';
import assert from 'node:assert/strict';
import { buildNativeGraph, verifyNativeGraph } from './build-native.mjs';
// Source-only verification must not overwrite tracked graph/CSS exports.
const compareRouting = process.argv.includes('--compare-routing');
const graph = process.argv.includes('--in-memory') || compareRouting ? buildNativeGraph() : JSON.parse(fs.readFileSync(new URL('./native-graph.json', import.meta.url)));
const audit = verifyNativeGraph(graph);
if (compareRouting) {
  const baseline = buildNativeGraph({ optimizeRouting: false });
  const baselineAudit = verifyNativeGraph(baseline);
  const identities = input => input.collections.filter(c => !['palette', 'theme', 'scheme'].includes(c.key)).map(c => ({ key: c.key, modes: c.modes, variables: c.variables.map(v => ({ name: v.name, figmaName: v.figmaName, type: v.type, scopes: v.scopes })) }));
  assert.deepEqual(identities(graph), identities(baseline), 'Public native identities and scopes remain unchanged');
  assert(audit.totalVariables <= baselineAudit.totalVariables, 'Routing optimization must not increase variable count');
  audit.routingBaselineVariables = baselineAudit.totalVariables;
  audit.publicIdentitiesAndScopesPreserved = true;
}
console.log(JSON.stringify(audit, null, 2));
