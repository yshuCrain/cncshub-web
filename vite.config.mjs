import { createRequire } from 'node:module';
import { relative, sep } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { classicScriptAssets } from './scripts/vite-classic-assets.mjs';

const { root, pageFiles } = createRequire(import.meta.url)('./scripts/site-utils.cjs');
const input = Object.fromEntries(pageFiles().map(file => [relative(root, file).split(sep).join('/').replace(/\.html$/, ''), file]));

export default defineConfig({
    root,
    appType: 'mpa',
    plugins: [react(), ...classicScriptAssets()],
    build: { outDir: 'dist', emptyOutDir: true, rolldownOptions: { input } },
    server: { port: 5173, open: false },
    preview: { port: 4173 },
});
