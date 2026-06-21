# Symbol library (shared SCADA pictograms)

Canonical, single-source SCADA symbol library consumed by **both** NEXO Hub and
NEXO Edge via this `nexo-branding` submodule (decision 2026-06-21 — same library
+ primitives so the two products' synoptics are overlayable).

## Layout
- `symbols/` — the **served** library. `catalog.json` + 8 category dirs
  (`automation-control`, `energy-power`, `process-equipment`, `alarms-safety`,
  `arrows-flow`, `measurement-instruments`, `status-indicators`, `ev-charging`).
  **660** curated symbols (~0.84 MB on the wire). Each SVG is monochrome
  `viewBox="0 0 48 48"`, root `fill="currentColor"` → recolourable from the
  consuming widget's colour; inlined (not `<img>`) so it can also be animated.
- `symbols.classification.{json,md}` — provenance: all 1415 source ABB
  pictograms classified into 14 SCADA categories (relevance + recolourability).
- `scripts/import-symbols.mjs` — the regenerator. `node scripts/import-symbols.mjs
  [mediaDir]` (mediaDir defaults to the ABB pictogram set). Strips the hidden
  alignment `<g id="grid">` block + any scripts/handlers; re-emits the curated
  core. Tier-2 ABB-SKU (~109) and Tier-3 ISO signs stay out, regenerable on demand.

## How consumers wire it
Each app symlinks (junction on Windows) `ui/public/symbols → branding/symbols` in
its `link-branding.mjs` so the library is served at **`/symbols/*`** (same URL
convention in both products). Prod: the folder is COPYed into the UI image at
`npm run build` — no extra installer step.

Provenance: curated in nexo-edge, promoted here as the canonical source 2026-06-21.
