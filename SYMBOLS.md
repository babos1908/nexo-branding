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
  Cleans and validates every file **in memory first** — if any symbol fails, the run
  aborts and `symbols/` is left untouched.
- `scripts/verify-symbols.mjs` — checks the **committed** library (no ABB source
  needed). `scripts/svg-tools.mjs` holds the shared parsing primitives, covered by
  `scripts/svg-tools.test.mjs` (`node --test scripts/svg-tools.test.mjs`). CI runs
  both plus an independent expat parse on every change to `symbols/` or `scripts/`.

## The invariant: every symbol is well-formed XML
Consumers inline the markup with `[innerHTML]`, and **HTML parsing silently forgives
malformed tags** — so a broken symbol renders fine in both products and stays hidden.
Anything that parses it as XML (`<img src>`, CSS `mask`, an SVG sprite build, most
design tools) gets nothing at all.

This is not hypothetical: 360 of the 660 files once shipped with unbalanced `<g>`
tags, and 63 of those were empty 108-byte shells with the artwork gone entirely. The
cause was a non-greedy regex (`<g…id="grid"…>[\s\S]*?</g>`) stopping at the *first*
`</g>` — see the header of `scripts/svg-tools.mjs` for the two source shapes that
defeat it, and the mislabelled files where the artwork lives inside `<g id="grid">`
and stripping by id alone empties the symbol.

Both the exporter and `verify-symbols.mjs` enforce: well-formed XML, `<svg>` root,
at least one drawing primitive, and no dangling `url(#…)` / `href="#…"` reference.

## How consumers wire it
Each app symlinks (junction on Windows) `ui/public/symbols → branding/symbols` in
its `link-branding.mjs` so the library is served at **`/symbols/*`** (same URL
convention in both products). Prod: the folder is COPYed into the UI image at
`npm run build` — no extra installer step.

Provenance: curated in nexo-edge, promoted here as the canonical source 2026-06-21.
