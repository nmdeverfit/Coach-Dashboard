import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode single` inlines every asset into one HTML file so the demo can be shared as a single page. Its identifiers
// stay unminified: some minified name sequences make the artifact service take the page for a PR review page and
// refuse it ("too large for a review page"), and which ones do changes with every edit.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  esbuild: mode === 'single' ? { minifyIdentifiers: false } : {},
  build: mode === 'single' ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000 } : {},
}));
