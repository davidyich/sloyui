import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { documentsPlugin } from './scripts/document-server';
export default defineConfig({
  plugins: [react(), documentsPlugin()],
  resolve: { alias: [{ find: /^@personal\/capacities-ui$/, replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)) }] },
  build: { outDir: 'site', emptyOutDir: true },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], include: ['tests/**/*.test.{ts,tsx}'] },
});
