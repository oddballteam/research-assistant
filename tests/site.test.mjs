import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { root, read, json, textFiles } from './_helpers.mjs';

test('index.html only references files that exist, and no external scripts', () => {
  const html = read('public/index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((r) => !r.startsWith('data:'));
  assert.ok(refs.length >= 3);
  for (const r of refs) {
    assert.ok(!/^https?:/.test(r), `external reference: ${r}`);
    assert.ok(existsSync(join(root, 'public', r)), `missing public/${r}`);
  }
});

test('app.js and claude-shim.js are valid scripts', () => {
  for (const f of ['public/app.js', 'public/claude-shim.js']) assert.doesNotThrow(() => new vm.Script(read(f), { filename: f }));
});

test('app.js loads data only from data/sample/', () => {
  const app = read('public/app.js');
  assert.match(app, /DATA_BASE='data\/sample\/'/);
  assert.equal([...app.matchAll(/DATA_BASE=/g)].length, 1, 'DATA_BASE is set once and never changed');
  assert.doesNotMatch(app, /fetch\('research-index\.json'\)/);
  assert.doesNotMatch(app, /DATA_SAMPLE/);
});

test('every page says the data is fictional', () => {
  const app = read('public/app.js');
  assert.match(app, /Sample data: fictional studies, not real research/);
  assert.match(app, /Sample data · Index /);
});

test('app.js asks the runtime for downloads and nothing else', () => {
  const uses = [...read('public/app.js').matchAll(/claude\.use\(\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(uses)], ['downloads']);
  assert.doesNotMatch(read('public/app.js'), /\/api\//);
});

test('vercel.json is valid and its output directory exists', () => {
  const v = json('vercel.json');
  assert.equal(v.outputDirectory, 'public');
  assert.ok(existsSync(join(root, v.outputDirectory, 'index.html')));
  assert.ok(!v.functions, 'this app has no functions');
});

test('there is no server code and no key', () => {
  assert.ok(!existsSync(join(root, 'api')));
  assert.ok(!existsSync(join(root, '.env.example')));
});

test('no key-shaped strings anywhere in the repo', () => {
  const re = /sk-ant-[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}/;
  for (const f of textFiles()) assert.doesNotMatch(read(f.slice(root.length + 1)), re, f);
});

test('goal-alignment check is present and the split script will not silently erase it', () => {
  const app = read('public/app.js');
  assert.ok(app.includes('/* alignment:') && app.includes('/* end alignment */'));
  assert.ok(app.includes('alignPanel()') && app.includes('alignMd()'));
  const split = read('scripts/split-artifact.mjs');
  assert.ok(split.includes('--force') && split.includes('/* alignment:'));
});
