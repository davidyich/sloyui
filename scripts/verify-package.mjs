import { mkdtemp, mkdir, symlink, readFile, writeFile, copyFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const root = process.cwd(), tarball = resolve(process.argv[2] ?? `artifacts/personal-capacities-ui-${version}.tgz`);
await access(tarball);
const temp = await mkdtemp(join(tmpdir(), 'capacities-consumer-'));
try {
  const target = join(temp, 'node_modules/@personal/capacities-ui');
  await mkdir(target, { recursive: true });
  execFileSync('tar', ['-xzf', tarball, '--strip-components=1', '-C', target]);
  for (const name of ['react', 'react-dom', '@types']) await symlink(join(root, 'node_modules', name), join(temp, 'node_modules', name));
  await writeFile(join(temp, 'package.json'), '{"type":"module"}');
  for (const example of ['ProjectBoard', 'WorkspaceV2']) await copyFile(join(root, `examples/${example}.tsx`), join(temp, `${example}.tsx`));
  await writeFile(join(temp, 'consumer.tsx'), `import { Button, Dialog, Field, Input, type Color } from '@personal/capacities-ui';\nimport '@personal/capacities-ui/styles.css';\nconst color: Color = 'teal';\nexport const demo = <Dialog open={false} onOpenChange={() => {}} title="Test"><Field label="Title">{p => <Input {...p} />}</Field><Button variant="primary">{color}</Button></Dialog>;\n`);
  await writeFile(join(temp, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', jsx: 'react-jsx', strict: true, noEmit: true, skipLibCheck: false, lib: ['ES2022', 'DOM', 'DOM.Iterable'] }, include: ['*.tsx'] }));
  execFileSync(join(root, 'node_modules/.bin/tsc'), ['-p', join(temp, 'tsconfig.json')], { stdio: 'pipe' });
  await writeFile(join(temp, 'render.mjs'), `import React from 'react';import {renderToString} from 'react-dom/server';import {Button} from '@personal/capacities-ui';const html=renderToString(React.createElement(Button,{variant:'primary'},'Hello'));if(!html.includes('cap-button')||!html.includes('Hello'))throw Error('SSR failed');console.log('SSR import passed');`);
  execFileSync(process.execPath, [join(temp, 'render.mjs')], { stdio: 'pipe' });
  const fontCss = await readFile(join(target, 'dist/fonts.css'), 'utf8');
  const fontPaths = [...fontCss.matchAll(/url\(([^)]+)\)/g)].map(m => m[1]);
  for (const path of fontPaths) await access(join(target, 'dist', path));
  const manifest = JSON.parse(await readFile(join(target, 'agent-manifest.json'), 'utf8'));
  const packed = await build({ stdin: { contents: "export { Button } from '@personal/capacities-ui';", resolveDir: temp }, bundle: true, write: false, minify: true, format: 'esm', external: ['react','react-dom','react/jsx-runtime'] });
  const report = { package: manifest.package, componentCount: manifest.componentCount, isolatedArchiveConsumer: true, nodeNextTypes: true, exampleTypecheck: ['ProjectBoard', 'WorkspaceV2'], serverRenderImport: true, fontAssets: fontPaths.length, buttonGzipBytes: gzipSync(packed.outputFiles[0].contents).length };
  await writeFile(join(root, 'docs/package-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(report);
} catch (error) {
  if (error.stdout) console.error(error.stdout.toString());
  if (error.stderr) console.error(error.stderr.toString());
  throw error;
} finally { await rm(temp, { recursive: true, force: true }); }
