import test from 'node:test';
import assert from 'node:assert/strict';
import { json, read } from './_helpers.mjs';

const dir = 'public/data/sample';
const idx = json(`${dir}/research-index.json`);
const exi = json(`${dir}/explorer-index.json`);
const rl = json(`${dir}/repo-labels.json`);

function links(o, out = []) {
  if (typeof o === 'string') { if (/^https?:\/\//.test(o)) out.push(o); }
  else if (Array.isArray(o)) o.forEach((x) => links(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => links(x, out));
  return out;
}

test('every link in the sample data points at example.com', () => {
  for (const o of [idx, exi]) assert.ok(links(o).length > 0);
  for (const o of [idx, exi, rl]) for (const l of links(o)) assert.equal(new URL(l).hostname, 'example.com', l);
});

test('sample data carries no real-repository markers', () => {
  const all = [idx, exi, rl].map((o) => JSON.stringify(o)).join('\n');
  assert.doesNotMatch(all, /va\.ghe\.com|va\.gov-research-repository|va\.gov-team/);
});

test('limits text says the data is fictional', () => {
  assert.match(idx.limits.join(' '), /SAMPLE DATA/);
});

test('questions, quotes, headings and findings sit on the line they claim', () => {
  for (const d of idx.documents) {
    assert.equal(d.lines.length, d.lineCount, d.path);
    for (const q of d.questions) assert.ok(d.lines[q.line - 1].includes(q.text), `${d.path} Q L${q.line}`);
    for (const q of d.quotes) assert.ok(d.lines[q.line - 1].includes(q.text), `${d.path} quote L${q.line}`);
    for (const h of d.headings) assert.ok(d.lines[h.line - 1].endsWith(h.text), `${d.path} heading L${h.line}`);
    for (const f of d.findings) assert.ok(d.lines[f.line - 1].endsWith(f.text), `${d.path} finding L${f.line}`);
    for (const x of [...d.questions, ...d.quotes, ...d.findings]) assert.ok(x.link.endsWith(`#L${x.line}`), x.link);
  }
});

test('sample covers every document type the app handles, and a quote with each attribution', () => {
  const types = new Set(idx.documents.map((d) => d.type));
  for (const t of ['plan', 'guide', 'screener', 'findings']) assert.ok(types.has(t), t);
  const quotes = idx.documents.flatMap((d) => d.quotes);
  assert.ok(quotes.some((q) => q.participant), 'a participant-tagged quote');
  assert.ok(quotes.some((q) => q.role && !q.participant), 'a role-tagged quote');
  assert.ok(quotes.some((q) => q.attribution === 'none-in-source'), 'an unattributed quote');
});

test('board, folder and Explorer references line up', () => {
  const nums = new Set(idx.board.studies.map((s) => s.number));
  assert.equal(nums.size, idx.board.studies.length);
  const folders = new Set(idx.documents.map((d) => d.folder));
  for (const [f, ns] of Object.entries(idx.folderToBoard)) { assert.ok(folders.has(f), f); ns.forEach((n) => assert.ok(nums.has(n), n)); }
  assert.ok(idx.board.studies.some((s) => !Object.values(idx.folderToBoard).flat().includes(s.number)), 'a board-only study');
  const titles = new Set(idx.board.studies.map((s) => s.title));
  idx.structuredFindings.forEach((f) => assert.ok(titles.has(f.sourceStudy), f.id));
  exi.reports.forEach((r) => (r.bn || []).forEach((n) => assert.ok(nums.has(n), `${r.t} -> ${n}`)));
  assert.ok(exi.reports.some((r) => !r.bn.length), 'an Explorer-only report');
  const c = idx.board.counts;
  const by = (s) => idx.board.studies.filter((x) => x.status === s).length;
  assert.deepEqual(c, { Proposed: by('Proposed'), Current: by('Current'), Completed: by('Completed'), Unknown: by('Unknown') });
});

test('Explorer labels use only words from the label vocabulary', () => {
  for (const r of exi.reports) for (const f of r.f) for (const [k, v] of Object.entries(f.l)) {
    assert.ok(exi.labels[k].includes(v[0]), `${k}: ${v[0]}`);
    assert.ok(v[1] >= 0 && v[1] <= 1);
  }
  assert.equal(exi.source.reports, exi.reports.length);
  assert.equal(exi.source.findings, exi.reports.reduce((a, r) => a + r.f.length, 0));
});

test('the closing labels the Register step needs exist in the sample labels', () => {
  const m = read('public/app.js').match(/var OUTCOME=\[([^\]]+)\]/);
  assert.ok(m);
  const names = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  assert.equal(names.length, 6);
  for (const n of names) assert.ok(rl.labels.some((l) => l.n === n), n);
});
