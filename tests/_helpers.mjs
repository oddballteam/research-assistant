import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const read = (p) => readFileSync(join(root, p), 'utf8');
export const json = (p) => JSON.parse(read(p));

/** Every text file in the repo except node_modules, .git and the git-ignored real data. */
export function textFiles(dir = root, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', '.vercel'].includes(name)) continue;
    const p = join(dir, name);
    if (p === join(root, 'public', 'data')) { textFiles(join(p, 'sample'), out); continue; }
    const st = statSync(p);
    if (st.isDirectory()) textFiles(p, out);
    else if (/\.(m?js|json|html|css|md|yml|yaml|txt|example)$|^\.(gitignore|vercelignore)$/.test(name)) out.push(p);
  }
  return out;
}
