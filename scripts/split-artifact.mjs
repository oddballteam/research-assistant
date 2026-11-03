// Splits the single-file Claude artifact into public/index.html, styles.css and app.js,
// then applies the small, named patches this repo needs (see PATCHES below).
// Usage: node scripts/split-artifact.mjs [source.html] [outDir]
// Run it once to create public/, or again on a fresh artifact export. It overwrites
// index.html, styles.css and app.js, and re-applies the patches. If the artifact changed
// enough that a patch no longer matches, the script stops and names the patch.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve(process.argv[2] ?? 'source/research-assistant.artifact.html');
const out = resolve(process.argv[3] ?? 'public');
const html = readFileSync(src, 'utf8');

const must = (i, what) => { if (i < 0) throw new Error(`Could not find ${what} in ${src}`); return i; };

// 1. The reset style the artifact host injects in <head> (first <style>).
const resetStart = must(html.indexOf('<style>'), 'the host reset <style>');
const resetEnd = must(html.indexOf('</style>', resetStart), 'end of the host reset <style>');
const reset = html.slice(resetStart + 7, resetEnd).trim();

// 2. The page title.
const t0 = must(html.indexOf('<title>'), '<title>');
const title = html.slice(t0 + 7, must(html.indexOf('</title>', t0), '</title>')).trim();

// 3. The app's own stylesheet (the <style> after the title).
const cssOpen = must(html.indexOf('<style>', t0), 'the app <style>');
const cssClose = must(html.indexOf('</style>', cssOpen), 'end of the app <style>');
const css = html.slice(cssOpen + 7, cssClose).trim();

// 4. Body markup: everything between that stylesheet and the <script>.
const scriptOpen = must(html.indexOf('<script>', cssClose), 'the application <script>');
const markup = html.slice(cssClose + 8, scriptOpen).trim();

// 5. The application script.
const scriptClose = must(html.lastIndexOf('</script>'), 'the closing </script>');
let app = html.slice(scriptOpen + 8, scriptClose).trim();

/* ---------- patches to app.js ----------
   Each patch replaces text that must appear exactly once. Keep them few and small:
   the artifact is the source of truth, and everything else is the app as it was. */

// The artifact fetched its three data files from beside the page. Here they live in data/,
// and when the real files are not there the app falls back to the fictional data in data/sample/.
const BOOT_FROM = app.slice(
  must(app.indexOf("fetch('research-index.json')"), 'the boot fetch chain'),
  must(app.indexOf('\n', app.indexOf("fetch('research-index.json')")), 'end of the boot fetch chain'),
);
const BOOT_TO = `var DATA_BASE='data/sample/';
function getJson(name){return fetch(DATA_BASE+name).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
getJson('research-index.json').then(function(j){IDX=j;build();return getJson('explorer-index.json').then(function(x){try{EXI=x;attachExplorer()}catch(err){EXI=null;ENTS=ENTS.filter(function(e){return !e.exOnly});ENTS.forEach(function(e){e.ex=[]})}},function(){EXI=null})}).then(function(){return getJson('repo-labels.json').then(function(x){RL=x},function(){RL=null})}).then(function(){renderIdx();render()}).catch(function(e){$('#main').innerHTML='<div class="panel"><h2>The sample data did not load</h2><p class="lead">The page needs the files in public/data/sample/. Run npm run sample to re-create them. Error: '+esc(e.message||e)+'</p></div>';$('#idxbar').textContent='No index loaded';var sr2=$('#src');if(sr2)sr2.textContent='No index'});`;

const PATCHES = [
  ['boot: load only the fictional sample from data/sample/', BOOT_FROM, BOOT_TO],
  ['footer: say when the data is the fictional sample',
    "$('#idxbar').innerHTML='<span>Index built <b>'",
    "$('#idxbar').innerHTML='<span class=\"chip warn\">Sample data: fictional studies, not real research</span><span>Index built <b>'"],
  ['nav: say when the data is the fictional sample',
    "sr.innerHTML='<i aria-hidden=\"true\"></i><span>Index '",
    "sr.innerHTML='<i aria-hidden=\"true\" style=\"background:var(--orange)\"></i><span>Sample data · Index '"],
  ['limits text: say this build is sample-only',
    'To refresh, ask Claude to re-run build_index.py against your local clone and to rebuild the Explorer layer from research-explorer/taxonomy-data.json.',
    'This build shows fictional sample data only. To change it, edit scripts/make-sample-data.mjs and run npm run sample.'],
];

for (const [name, from, to] of PATCHES) {
  const n = app.split(from).length - 1;
  if (n !== 1) throw new Error(`Patch "${name}" matched ${n} times in app.js (expected 1). The artifact changed; update scripts/split-artifact.mjs.`);
  app = app.replace(from, () => to);
}

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<link rel="icon" href="data:,">
<link rel="stylesheet" href="styles.css">
</head>
<body>
${markup}
<script src="claude-shim.js"></script>
<script src="app.js"></script>
</body>
</html>
`;

// public/app.js now carries the goal-alignment check, which the artifact does not have.
// Re-splitting would erase it, so refuse unless the caller says so.
const existing = resolve(out, 'app.js');
if (existsSync(existing) && readFileSync(existing, 'utf8').includes('/* alignment:') && !process.argv.includes('--force')) {
  throw new Error('public/app.js has the goal-alignment check, which the artifact does not. Re-splitting would remove it. Re-run with --force to overwrite, then re-add the alignment block.');
}

mkdirSync(out, { recursive: true });
writeFileSync(resolve(out, 'index.html'), page);
writeFileSync(resolve(out, 'styles.css'),
  `/* Host reset carried over from the artifact wrapper. */\n${reset}\n\n/* Research Assistant */\n${css}\n`);
writeFileSync(resolve(out, 'app.js'), `${app}\n`);
console.log(`Wrote ${out}/index.html, styles.css, app.js (title: ${title}; ${PATCHES.length} patches applied)`);
