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
// Usage:  node scripts/import-symbols.mjs [mediaDir]
//   mediaDir defaults to C:/Users/Admin/Downloads/media (the ABB pictogram set).
// Run once when regenerating; the cleaned SVGs are committed under ../symbols.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  // hidden alignment grid (never renders)
  s = s.replace(/<g\b[^>]*\bid=["']grid["'][^>]*>[\s\S]*?<\/g>/gi, '');
  // defense: no scripts / inline handlers in a string consumers inline as trusted HTML
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
  return s.trim();
}

const cls = JSON.parse(readFileSync(CLASS, 'utf8'));
const keep = cls.filter(
  (x) =>
    x.relevance === 'high' &&
    CORE.has(x.category) &&
    !(x.category === 'alarms-safety' && x.file.startsWith('09_')),
);

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const catalog = {}; // category -> [{ key, name, file, keywords }]
let bytes = 0, missing = 0;
for (const item of keep) {
  const src = join(MEDIA, item.file);
  if (!existsSync(src)) { console.warn('MISSING', item.file); missing++; continue; }
  const cleaned = clean(readFileSync(src, 'utf8'));
  mkdirSync(join(OUT, item.category), { recursive: true });
  writeFileSync(join(OUT, item.category, item.file), cleaned);
  bytes += Buffer.byteLength(cleaned);
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
for (const k of Object.keys(catalog).sort()) console.log(`  ${k}: ${catalog[k].length}`);
