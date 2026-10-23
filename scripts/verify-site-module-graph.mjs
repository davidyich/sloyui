import { readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';

const root = resolve(process.argv[2] ?? 'site');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const entries = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["']/g)].map(match => match[1]);
if (!entries.length) throw new Error('No JavaScript entry found');
const pending = entries.map(entry => resolve(root, entry.replace(/^\//, '')));
const visited = new Set();
const reactRuntimes = [];
while (pending.length) {
  const file = pending.pop();
  if (visited.has(file)) continue;
  const path = relative(root, file);
  if (path.startsWith('..')) throw new Error(`Module outside site: ${path}`);
  const source = await readFile(file, 'utf8');
  visited.add(file);
  if (/Symbol\.for\(["']react\.transitional\.element["']\)/.test(source)) reactRuntimes.push(path);
  // Follow static imports, re-exports and literal dynamic imports emitted by Vite.
  for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']((?:\.\.?\/|\/)[^"']+\.js)["']/g)) {
    pending.push(match[1].startsWith('/') ? resolve(root, match[1].slice(1)) : resolve(dirname(file), match[1]));
  }
}
if (reactRuntimes.length !== 1) throw new Error(`Expected one React runtime in reachable modules; found ${reactRuntimes.length}: ${reactRuntimes.join(', ')}`);
console.log(`Module graph verified: ${visited.size} modules, one React runtime.`);
