import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './_helpers.mjs';

function load() {
  const clicks = [];
  const anchor = { click() { clicks.push({ href: this.href, download: this.download }); }, remove() {} };
  const sandbox = {
    Blob, setTimeout: () => 0,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    document: { createElement: () => ({ ...anchor, click: anchor.click }), body: { appendChild() {} } },
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('public/claude-shim.js'), sandbox);
  return { claude: sandbox.claude, clicks };
}

test('downloads.save triggers a browser download with the filename', async () => {
  const { claude, clicks } = load();
  const dl = await claude.use('downloads');
  await dl.save({ filename: 'plan.md', data: '# Plan' });
  assert.equal(clicks.length, 1);
  assert.equal(clicks[0].download, 'plan.md');
  assert.equal(clicks[0].href, 'blob:test');
});

test('anything other than downloads resolves to null', async () => {
  const { claude } = load();
  for (const n of ['sample', 'db', 'user', 'mcp', 'nope']) assert.equal(await claude.use(n), null);
});
