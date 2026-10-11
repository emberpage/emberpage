import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { chromium } from '../../node_modules/playwright/index.mjs';

const source = await readFile('../ipfs-browser/browser.js', 'utf8');
await writeFile('browser-snapshot.js', source);
const preservation = await readFile('../ipfs-browser/preservation.js', 'utf8');
await writeFile('preservation.js', preservation);
await mkdir('artifacts', { recursive: true });
const results = { at: new Date().toISOString(), sourceHash: createHash('sha256').update(source).digest('hex'), preservationHash: createHash('sha256').update(preservation).digest('hex'), builds: [] };
for (const [name, directory] of [['original-browser', '../ipfs-browser'], ['original-feeds', '../ipfs-feeds'], ['isolated', '.']]) {
  const audit = spawnSync('npm', ['audit', '--json'], { cwd: directory, encoding: 'utf8' });
  const report = JSON.parse(audit.stdout);
  await writeFile(`artifacts/${name}-audit.json`, JSON.stringify(report, null, 2));
  results[name] = { vulnerabilities: report.metadata.vulnerabilities, dependencies: report.metadata.dependencies, exitCode: audit.status };
}
for (const [name, directory] of [['original-browser', '../ipfs-browser'], ['isolated', '.']]) {
  const original = name === 'original-browser';
  const entry = original ? resolve(directory, 'browser.js') : resolve('browser-snapshot.js');
  const output = resolve(`artifacts/${name}.js`);
  const built = await build({ entryPoints: [entry], outfile: output, bundle: true, format: 'esm', platform: 'browser', target: 'chrome130', minify: true, metafile: true });
  const contributed = Object.entries(built.metafile.outputs).flatMap(([, o]) => Object.entries(o.inputs).filter(([, i]) => i.bytesInOutput > 0).map(([path, i]) => ({ path, bytes: i.bytesInOutput })));
  const suspicious = contributed.filter(i => /node-forge|braces|micromatch|react-native|metro|acme-client|auto-tls|@helia\/http|delegated-routing/.test(i.path));
  await writeFile(`artifacts/${name}-metafile.json`, JSON.stringify(built.metafile, null, 2));
  const code = await readFile(output, 'utf8');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_BIN || undefined });
  try {
    const page = await browser.newPage();
    await page.setContent('<pre></pre>');
    await page.addScriptTag({ content: code, type: 'module' });
    await page.waitForFunction(() => typeof window.spike?.start === 'function');
    results.builds.push({ name, bundleBytes: Buffer.byteLength(code), contributedModules: contributed.length, suspicious, smoke: 'bundle evaluated; spike API present' });
  } finally { await browser.close(); }
}
await writeFile('artifacts/results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
