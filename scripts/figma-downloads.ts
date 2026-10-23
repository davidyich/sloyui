import type { Plugin } from 'vite';
import { readFile, readdir } from 'node:fs/promises';

/** Serve generated token files unchanged in development and the static build. */
export function figmaDownloadsPlugin(): Plugin {
  const directory = new URL('../src/tokens/figma/', import.meta.url);
  return {
    name: 'sloy-figma-downloads',
    configureServer(server) {
      server.middlewares.use('/figma-tokens', async (request, response, next) => {
        const filename = (request.url || '').split('?')[0].slice(1);
        if (!/^[a-z0-9.-]+\.(json|zip)$/.test(filename)) return next();
        try {
          const source = await readFile(new URL(filename, directory));
          response.setHeader('Content-Type', filename.endsWith('.zip') ? 'application/zip' : 'application/json; charset=utf-8');
          response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          response.end(source);
        } catch { next(); }
      });
    },
    async generateBundle() {
      for (const filename of await readdir(directory)) {
        this.emitFile({ type: 'asset', fileName: `figma-tokens/${filename}`, source: await readFile(new URL(filename, directory)) });
      }
    },
  };
}
