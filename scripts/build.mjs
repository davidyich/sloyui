import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
await mkdir('dist', { recursive: true });
// Preserve PURE annotations in the published ESM so consumers can remove unused forwardRef calls.
await build({ entryPoints: ['src/index.ts'], outdir: 'dist', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', external: ['react', 'react-dom', 'react/jsx-runtime'], minifySyntax: true, banner: { js: '"use client";' } });
await build({ entryPoints: ['src/styles/styles.css', 'src/styles/tokens.css', 'src/styles/source-tokens.css'], outdir: 'dist', bundle: true, minify: true });
await cp('src/tokens', 'dist/tokens', { recursive: true });
await cp('src/styles/fonts', 'dist/fonts', { recursive: true });
await cp('src/styles/fonts.css', 'dist/fonts.css');
const files = ['index.js', 'styles.css', 'tokens.css', 'source-tokens.css'];
const sizes = {};
for (const f of files) { const data = await readFile(`dist/${f}`); sizes[f] = { bytes: data.length, gzipBytes: gzipSync(data).length }; }
const button = await build({ stdin: { contents: "export { Button } from './dist/index.js';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', minify: true, external: ['react', 'react-dom', 'react/jsx-runtime'] });
sizes['button-only.js'] = { bytes: button.outputFiles[0].contents.length, gzipBytes: gzipSync(button.outputFiles[0].contents).length };
const all = await build({ entryPoints: ['dist/index.js'], bundle: true, write: false, format: 'esm', minify: true, external: ['react', 'react-dom', 'react/jsx-runtime'] });
sizes['all-components-minified.js'] = { bytes: all.outputFiles[0].contents.length, gzipBytes: gzipSync(all.outputFiles[0].contents).length };
await writeFile('docs/bundle-size.json', JSON.stringify(sizes, null, 2));
console.log(sizes);
