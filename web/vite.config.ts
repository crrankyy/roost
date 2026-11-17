import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The Roost design system's sources live in ui/ (imported as @roost/ui).
const roostSrc = fileURLToPath(new URL('./ui/src/index.ts', import.meta.url));
// `npm run dev` talks to `wrangler dev` (npm run dev in the repo root) for the data, the reports and the fonts.
const worker = process.env.ROOST_DEV_WORKER ?? 'http://localhost:8787';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@roost/ui': roostSrc }, dedupe: ['react', 'react-dom'] },
  server: { proxy: Object.fromEntries(['/api', '/p/', '/_fonts', '/triage/preview'].map((p) => [p, worker])) },
  build: {
    outDir: 'dist', sourcemap: true, target: 'es2022', assetsDir: '_app',
    rollupOptions: {
      // Two entries: the hub app (index.html) and the bar the Worker adds to every hosted report, at fixed names.
      input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), 'report-bar': fileURLToPath(new URL('./src/report-bar.tsx', import.meta.url)) },
      output: {
        entryFileNames: (c) => (c.name === 'report-bar' ? '_app/report-bar.js' : '_app/[name]-[hash].js'),
        assetFileNames: (a) => (a.name === 'report-bar.css' ? '_app/report-bar.css' : '_app/[name]-[hash][extname]'),
      },
    },
  },
});
