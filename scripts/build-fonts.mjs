import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
await mkdir('src/styles/fonts', { recursive: true });
let css = '/* Optional, self-hosted variable fonts. Latin, Latin Extended, Cyrillic. */\n';
for (const family of ['inter', 'overpass-mono']) {
  const root = `node_modules/@fontsource-variable/${family}`;
  for (const style of family === 'inter' ? ['normal', 'italic'] : ['normal']) {
    const source = await readFile(`${root}/${style === 'normal' ? 'wght.css' : 'wght-italic.css'}`, 'utf8');
    for (const block of source.matchAll(/@font-face\s*\{[^}]+\}/g)) {
      const name = block[0].match(/url\(\.\/files\/([^)]+)\)/)[1];
      if (!['latin', 'latin-ext', 'cyrillic'].some(s => name === `${family}-${s}-wght-${style}.woff2`)) continue;
      await copyFile(`${root}/files/${name}`, `src/styles/fonts/${name}`);
      css += block[0].replaceAll('./files/', './fonts/').replaceAll('Inter Variable', 'Inter').replaceAll('Overpass Mono Variable', 'Overpass Mono') + '\n';
    }
  }
  await copyFile(`${root}/LICENSE`, `src/styles/fonts/${family}-LICENSE.txt`);
}
await writeFile('src/styles/fonts.css', css);
