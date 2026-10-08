import { defineConfig } from 'vitest/config';
import brand from './src/brand.json';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import { documentsPlugin } from './scripts/document-server';
export default defineConfig({
  plugins: [react(), documentsPlugin(), { name: 'sloy-brand', transformIndexHtml(html) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 28"><path fill="#171717" d="${brand.logoPath}"/></svg>`;
    const values = { NAME: brand.name, DESCRIPTION: brand.description, URL: brand.url, ICON: `data:image/svg+xml,${encodeURIComponent(svg)}` };
    return html.replace(/%SLOY_(NAME|DESCRIPTION|URL|ICON)%/g, (_, key: keyof typeof values) => values[key]);
  }, async generateBundle() {
    // The static catalogue bundles React, fonts and icons too: ship their notices.
    for (const path of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'docs/third-party.md', ...(await readdir('licenses')).map(name => `licenses/${name}`)]) {
      this.emitFile({ type: 'asset', fileName: path, source: await readFile(path, 'utf8') });
    }
  } }],
  resolve: { alias: [{ find: /^sloyui$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)) }] },
  build: { outDir: 'site', emptyOutDir: true },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], include: ['tests/**/*.test.{ts,tsx}'] },
});
