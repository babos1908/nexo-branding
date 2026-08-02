// Canonical regenerator for the bundled SCADA symbol library (shared by NEXO
// Hub + NEXO Edge via this submodule). Reads ../symbols.classification.json,
// keeps the high-relevance core (minus the ISO wayfinding bulk), copies each
// cleaned SVG into ../symbols/<category>/<file>, and writes ../symbols/catalog.json.
//
// Provenance: 1415 ABB monochrome pictograms (viewBox 0 0 48 48, fill=currentColor,
// id="pictogram"). Classified into 14 SCADA categories; this script emits the
// curated 660-symbol core (8 categories). Originally authored in nexo-edge and
// promoted here as the single canonical source (decision 2026-06-21).
//
// Cleaning per file:
//   - strip the hidden `<g id="grid" display="none">…</g>` alignment block
//     (~96 cyan lines, never rendered) — shrinks the file and removes the only
//     non-currentColor noise on the bulk of the set;
//   - strip the XML prolog + any <script>/on*= handlers (defense; consumers
//     inline the SVG so currentColor + animation apply).
//
// The output MUST be well-formed XML. Consumers inject it with [innerHTML], and
// HTML parsing is lenient enough to hide a broken tag structure — but <img src>,
// CSS masks, sprite builds and design tools all parse it as XML and render nothing.
// Every file is therefore cleaned and validated in memory first; if any file fails,
// the run aborts and the committed tree is left untouched. See scripts/svg-tools.mjs
// for the regex trap this replaced.
//
// Usage:  node scripts/import-symbols.mjs [mediaDir]
//   mediaDir defaults to C:/Users/Admin/Downloads/media (the ABB pictogram set).
// Run once when regenerating; the cleaned SVGs are committed under ../symbols.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stripAlignmentGrid, pruneDeadClassRules, checkWellFormed, countDrawing, findDanglingRefs,
} from './svg-tools.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..'); // nexo-branding/
const MEDIA = process.argv[2] || 'C:/Users/Admin/Downloads/media';
const CLASS = join(REPO, 'symbols.classification.json');
const OUT = join(REPO, 'symbols'); // nexo-branding/symbols

const CORE = new Set([
  'process-equipment', 'energy-power', 'ev-charging', 'arrows-flow',
  'measurement-instruments', 'status-indicators', 'alarms-safety', 'automation-control',
]);

function clean(svg) {
  let s = svg.replace(/<\?xml[^>]*\?>/i, '').trim();
  // hidden alignment grid (never renders) — depth-aware, and skipped entirely on the
  // handful of files where the group is mislabelled and holds the real artwork
  const grid = stripAlignmentGrid(s);
  s = grid.svg;
  // the grid took its stylesheet rules with it; drop the ones nothing matches any more
  s = pruneDeadClassRules(s);
  // defense: no scripts / inline handlers in a string consumers inline as trusted HTML
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
  return { svg: s.trim(), removed: grid.removed, keptMislabelled: grid.keptMislabelled };
}

const cls = JSON.parse(readFileSync(CLASS, 'utf8'));
const keep = cls.filter(
  (x) =>
    x.relevance === 'high' &&
    CORE.has(x.category) &&
    !(x.category === 'alarms-safety' && x.file.startsWith('09_')),
);

// -- pass 1: clean + validate everything in memory; write nothing yet --------
const staged = []; // { category, file, name, keywords, svg }
const failures = [];
const mislabelled = []; // grid/pictogram swapped upstream — grid group deliberately kept
let missing = 0, gridDrops = 0;

for (const item of keep) {
  const src = join(MEDIA, item.file);
  if (!existsSync(src)) { console.warn('MISSING', item.file); missing++; continue; }

  const raw = readFileSync(src, 'utf8');
  let svg, removed, keptMislabelled;
  try {
    ({ svg, removed, keptMislabelled } = clean(raw));
  } catch (err) {
    failures.push(`${item.category}/${item.file}: clean failed — ${err.message}`);
    continue;
  }

  const malformed = checkWellFormed(svg);
  if (malformed) {
    failures.push(`${item.category}/${item.file}: not well-formed XML — ${malformed}`);
    continue;
  }
  if (!/^<svg\b/i.test(svg)) {
    failures.push(`${item.category}/${item.file}: root element is not <svg>`);
    continue;
  }
  if (countDrawing(svg) === 0) {
    failures.push(`${item.category}/${item.file}: cleaning left no drawing content`);
    continue;
  }
  // stripping a group must not orphan a clip-path / <use> the artwork still points at
  const dangling = findDanglingRefs(svg);
  if (dangling.length) {
    failures.push(`${item.category}/${item.file}: dangling reference(s) after cleaning — ${dangling.join(', ')}`);
    continue;
  }
  gridDrops += removed;
  if (keptMislabelled) mislabelled.push(`${item.category}/${item.file}`);

  staged.push({ ...item, svg });
}

if (failures.length) {
  console.error(`\nABORTED — ${failures.length} symbol(s) failed validation; ${OUT} left untouched:\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

// -- pass 2: everything validated, now replace the tree ----------------------
if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const catalog = {}; // category -> [{ key, name, file, keywords }]
let bytes = 0;
for (const item of staged) {
  mkdirSync(join(OUT, item.category), { recursive: true });
  writeFileSync(join(OUT, item.category, item.file), item.svg);
  bytes += Buffer.byteLength(item.svg);
  const base = item.file.replace(/\.svg$/i, '');
  (catalog[item.category] ??= []).push({
    key: `${item.category}/${base}`,
    name: item.name,
    file: item.file,
    keywords: item.keywords || [],
  });
}
for (const k of Object.keys(catalog)) catalog[k].sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(join(OUT, 'catalog.json'), JSON.stringify(catalog));

const total = Object.values(catalog).reduce((n, a) => n + a.length, 0);
console.log(
  `imported ${total} symbols (${missing} missing) across ${Object.keys(catalog).length} categories, ` +
  `${(bytes / 1024 / 1024).toFixed(2)} MB → ${OUT}`,
);
console.log(`all ${total} validated as well-formed XML; ${gridDrops} hidden grid primitives stripped`);
if (mislabelled.length) {
  console.log(
    `\n${mislabelled.length} file(s) ship the artwork inside <g id="grid"> (upstream mislabelling);\n` +
    'their grid group is kept deliberately — stripping it by id would empty the symbol:',
  );
  for (const f of mislabelled) console.log(`  ${f}`);
}
console.log();
for (const k of Object.keys(catalog).sort()) console.log(`  ${k}: ${catalog[k].length}`);
