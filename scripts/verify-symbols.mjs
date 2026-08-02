// Validates the COMMITTED symbol library — the invariant consumers depend on.
//
// import-symbols.mjs gates its own output, but it only runs on a full re-export from
// the ABB source (which most machines do not have). This checks what is actually in
// the repo, so a hand-edit, a bad merge, or an optimiser pass cannot quietly reintroduce
// markup that only an HTML parser will accept.
//
// Every symbol must:
//   - be well-formed XML (this is the one that broke: 360 of 660 files once shipped
//     unbalanced <g> tags, invisible through [innerHTML] but fatal to <img src>,
//     CSS masks, sprite builds and design tools);
//   - have <svg> as its root element;
//   - contain at least one drawing primitive;
//   - leave no dangling url(#…) / href="#…" reference;
//   - be listed in catalog.json, and vice versa.
//
// Usage:  node scripts/verify-symbols.mjs
// Exits non-zero on the first failing invariant, listing every offender.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkWellFormed, countDrawing, findDanglingRefs } from './svg-tools.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SYMBOLS = join(here, '..', 'symbols');

if (!existsSync(SYMBOLS)) {
  console.error(`no symbol library at ${SYMBOLS}`);
  process.exit(1);
}

const found = []; // "category/file.svg"
for (const cat of readdirSync(SYMBOLS)) {
  const dir = join(SYMBOLS, cat);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of readdirSync(dir)) if (f.endsWith('.svg')) found.push(`${cat}/${f}`);
}
found.sort();

const problems = [];
for (const rel of found) {
  const svg = readFileSync(join(SYMBOLS, rel), 'utf8');

  const malformed = checkWellFormed(svg);
  if (malformed) problems.push(`${rel}: not well-formed XML — ${malformed}`);
  if (!/^\s*(<\?xml[^>]*\?>\s*)?<svg\b/i.test(svg)) problems.push(`${rel}: root element is not <svg>`);
  if (countDrawing(svg) === 0) problems.push(`${rel}: no drawing content`);

  const dangling = findDanglingRefs(svg);
  if (dangling.length) problems.push(`${rel}: dangling reference(s) — ${dangling.join(', ')}`);
}

// catalog.json must describe exactly the files on disk
const catalogPath = join(SYMBOLS, 'catalog.json');
if (!existsSync(catalogPath)) {
  problems.push('catalog.json is missing');
} else {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const listed = new Set();
  for (const [cat, entries] of Object.entries(catalog)) {
    for (const e of entries) listed.add(`${cat}/${e.file}`);
  }
  for (const rel of found) if (!listed.has(rel)) problems.push(`${rel}: on disk but absent from catalog.json`);
  for (const rel of listed) if (!found.includes(rel)) problems.push(`${rel}: in catalog.json but missing on disk`);
}

if (problems.length) {
  console.error(`FAILED — ${problems.length} problem(s) across ${found.length} symbols:\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`ok — ${found.length} symbols: well-formed XML, non-empty, no dangling refs, catalog in sync`);
