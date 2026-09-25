import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/src', { recursive: true });
for (const path of ['index.html', 'sw.js', 'manifest.webmanifest', 'assets', 'icons']) {
  await cp(path, `dist/${path}`, { recursive: true });
}
for (const name of ['styles.css', 'calculator.js', 'filter-calculator.js', 'manual-calculator.js', 'machine-guides.js', 'app.js']) {
  await cp(`src/${name}`, `dist/src/${name}`);
}
await build({ entryPoints: ['src/access.js'], bundle: true, format: 'iife', platform: 'browser', target: 'es2020', minify: true, outfile: 'dist/src/access.bundle.js' });
