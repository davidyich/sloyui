import { defineConfig } from 'vitest/config';
import brand from './src/brand.json';
import { version } from './package.json';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import { documentsPlugin } from './scripts/document-server';
import { figmaDownloadsPlugin } from './scripts/figma-downloads';
import { catalogServerPlugin } from './scripts/catalog-server';
export default defineConfig({
  base: './',
  server: { proxy: process.env.CATALOG_API_URL ? {'/api':process.env.CATALOG_API_URL} : undefined },
  plugins: [{ name: 'sloy-palette-lab-directory', configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const [pathname, query] = (request.url || '').split('?');
      if (pathname !== '/palette-lab' && pathname !== '/palette-lab/') return next();
      response.statusCode = 302;
      response.setHeader('Location', `/palette-lab/index.html${query ? '?' + query : ''}`);
      response.end();
    });
  } }, react(), documentsPlugin(), figmaDownloadsPlugin(), catalogServerPlugin(), { name: 'sloy-brand', transformIndexHtml(html) {
    const values = { NAME: brand.name, DESCRIPTION: brand.description, URL: brand.url, ICON: `./${brand.iconFile}?v=${version}` };
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
