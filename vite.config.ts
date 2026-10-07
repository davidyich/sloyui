import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { documentsPlugin } from './scripts/document-server';
export default defineConfig({
  plugins: [react(), documentsPlugin()],
  build: { outDir: 'site', emptyOutDir: true },
  test: { environment: 'jsdom', setupFiles: ['./tests/setup.ts'], include: ['tests/**/*.test.{ts,tsx}'] },
});
