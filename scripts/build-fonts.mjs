import { readFile, writeFile, cp, mkdir } from 'node:fs/promises';

const root = 'node_modules/medeo-font';
await mkdir('src/styles/fonts', { recursive: true });
await cp(`${root}/dist/fonts`, 'src/styles/fonts', { recursive: true });
await writeFile('src/styles/fonts/medeo-LICENSE.txt', (await readFile(`${root}/LICENSE.txt`, 'utf8')).replace(/[ \t]+$/gm, ''));
let css = '/* Optional, self-hosted Medeo variable fonts. Pixel is an archived display face. */\n';
for (const family of ['sans', 'mono', 'pixel']) {
  const source = await readFile(`${root}/dist/${family}.css`, 'utf8');
  for (const [block] of source.matchAll(/@font-face\s*\{[^}]+\}/g)) {
    css += block.replace(/url\("([^"]+)"\)/g, 'url($1)') + '\n';
  }
}
await writeFile('src/styles/fonts.css', css);
