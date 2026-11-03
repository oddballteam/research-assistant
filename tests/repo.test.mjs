import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, read } from './_helpers.mjs';

test('.gitignore excludes stray JSON in public/data/ and does not exclude the sample', () => {
  const g = read('.gitignore');
  assert.match(g, /^public\/data\/\*\.json$/m);
  assert.ok(!g.split('\n').some((l) => !l.startsWith('#') && /sample/.test(l)), 'no rule may hide the sample');
  assert.match(g, /^\.env$/m);
});

test('.vercelignore never uploads stray JSON from public/data/', () => {
  assert.match(read('.vercelignore'), /^public\/data\/\*\.json$/m);
});

test('split-artifact re-creates the app and every patch still applies', () => {
  const out = mkdtempSync(join(tmpdir(), 'ra-split-'));
  execFileSync('node', [join(root, 'scripts/split-artifact.mjs'), join(root, 'source/research-assistant.artifact.html'), out], { cwd: root });
  for (const f of ['index.html', 'styles.css', 'app.js']) assert.ok(existsSync(join(out, f)), f);
  assert.match(readFileSync(join(out, 'app.js'), 'utf8'), /DATA_BASE='data\/sample\/'/);
});

test('the committed app.js still has the sample-only data loading', () => {
  const out = mkdtempSync(join(tmpdir(), 'ra-split-'));
  execFileSync('node', [join(root, 'scripts/split-artifact.mjs'), join(root, 'source/research-assistant.artifact.html'), out], { cwd: root });
  // public/ may be edited directly (see CLAUDE.md), so only the sample-only data loading is enforced here.
  const app = readFileSync(join(root, 'public/app.js'), 'utf8');
  assert.match(app, /DATA_BASE='data\/sample\/'/);
});
