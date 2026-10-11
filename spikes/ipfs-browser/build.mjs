import { build } from 'esbuild';
await build({ entryPoints: ['browser.js'], outfile: 'dist/browser.js', bundle: true, format: 'esm', platform: 'browser', target: 'chrome130', minify: true });
