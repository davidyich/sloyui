import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const source = resolve('figma/token-system-v4');
const destination = resolve('public/token-system-v4');
await mkdir(destination, { recursive: true });
const files = ['graph.json', 'source.json', 'tokens.css', 'guide.md', 'explorer.html'];
await Promise.all(files.map(filename => copyFile(resolve(source, filename), resolve(destination, filename))));
console.log(`Token system v4 site downloads: ${files.length} files copied from authoritative exports.`);

// Native Figma and project-scoped background tools are separate from the
// runtime graph, so their downloads retain an explicit directory and contract.
const nativeSource = resolve('figma/color-system-v2');
const nativeDestination = resolve('public/color-system-v2');
const nativeFiles = ['native-graph.json', 'native.css', 'export-custom.mjs', 'README.md', 'designer-guide.md'];
await mkdir(nativeDestination, { recursive: true });
await Promise.all(nativeFiles.map(filename => copyFile(resolve(nativeSource, filename), resolve(nativeDestination, filename))));
console.log(`Native and Custom site downloads: ${nativeFiles.length} files copied.`);

// Keep Palette Lab deployable as its own workspace within the catalogue site.
await import('../figma/color-system-v2/editor/build.mjs');
await mkdir(resolve('public/palette-lab'), { recursive: true });
await copyFile(resolve('figma/color-system-v2/palette-editor.html'), resolve('public/palette-lab/index.html'));
