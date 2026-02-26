import { build, context } from 'esbuild';
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';

const isWatch = process.argv.includes('--watch');

async function buildAll() {
  mkdirSync('figma-plugin/dist', { recursive: true });

  await build({
    entryPoints: ['figma-plugin/src/main.ts'],
    outfile: 'figma-plugin/dist/main.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    sourcemap: true,
  });

  await build({
    entryPoints: ['figma-plugin/src/ui.ts'],
    outfile: 'figma-plugin/dist/ui.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    sourcemap: true,
  });

  copyFileSync('figma-plugin/src/ui.html', 'figma-plugin/dist/ui.html');

  console.log('Built plugin to figma-plugin/dist');
}

async function watchAll() {
  const ctx1 = await context({
    entryPoints: ['figma-plugin/src/main.ts'],
    outfile: 'figma-plugin/dist/main.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    sourcemap: true,
  });

  const ctx2 = await context({
    entryPoints: ['figma-plugin/src/ui.ts'],
    outfile: 'figma-plugin/dist/ui.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    sourcemap: true,
  });

  await ctx1.watch();
  await ctx2.watch();

  // naive copy-once for html
  copyFileSync('figma-plugin/src/ui.html', 'figma-plugin/dist/ui.html');

  console.log('Watching...');
}

if (isWatch) {
  await watchAll();
} else {
  await buildAll();
}
