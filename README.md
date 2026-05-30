# NEXO Branding

Official branding assets and guidelines. This folder is a git submodule pointing at the `nexo-branding` repository — edit there, not here.

## Brand essence

- **Mission:** transparency, simplicity, no hidden fees.
- **Vision:** make EV charging and infrastructure monitoring open and accessible.
- **Taglines:**
  - *NEXO Charge:* "Pay for connectors, not for kilowatts."
  - *NEXO Hub:* "Connect. Monitor. Control."
  - *NEXO Edge:* "Real-time, on your floor."

## Logo

Four variants live under `logo/`, each in SVG (preferred), PNG (256 / 512 px), ICO (favicons), and PDF.

| Variant | Light background | Dark background |
|---|---|---|
| **Master** (mono) | `#111827` on white | white on `#111827` |
| **Charge** | `#22C55E` green (accent `#3B82F6`) | green on dark |
| **Hub** | `#06B6D4` cyan | cyan on `#0B0F17` |
| **Edge** | `#C2410C` auburn | auburn on `#0B0F17` |

Structured color values are in `palette/tokens.json`; Tailwind integration in `palette/tailwind.theme.json`. Per-product 5-stop palettes live alongside as `palette/<product>.json` (currently `edge.json`; Hub and Charge use the single-stop entries in `tokens.json`).

### Product color rationale

| Product | Primary | Semantic intent |
|---|---|---|
| **Hub** | `#06B6D4` (cyan) | Cloud / data / transparent connectivity. Cool, B2B, dense. |
| **Charge** | `#22C55E` (green) + `#3B82F6` (blue accent) | Renewable energy / accessibility / EV-positive. Open, consumer-friendly. |
| **Edge** | `#C2410C` (auburn) | Hardware / plant-floor / forge. Warm, industrial, deterministic — opposite of Hub's cloud signal. |

The Edge primary deliberately avoids the four hardcoded SCADA alarm colors (`#67E8F9` info, `#FCD34D` warning, `#F59E0B` major, `#FCA5A5` critical): auburn sits in a different lightness band than the major-alarm orange and remains unambiguous on plant-floor monitors.

### Edge palette (5-stop + accent)

For surface elevations, hover and pressed states, build everything off these tokens (full definition in `palette/edge.json`):

| Token | Hex | Use |
|---|---|---|
| `edge-300` | `#FB923C` | Text / icon on dark (8.47:1 AAA), links, prominent values |
| `edge-500` | `#EA580C` | Hover state, secondary fills (5.39:1 AA Large) |
| `edge-700` | `#C2410C` | **BASE** — logo, primary buttons, focus rings (3.70:1, fills only — not text) |
| `edge-800` | `#9A3412` | Pressed state, deep accent |
| `edge-900` | `#7C2D12` | Surface tint, selected-row background |
| accent | `#FBBF24` | Non-status highlights only — never for alarm semantics |

### Edge tray icon (Tauri 2)

The Edge desktop app runs a Tauri 2 system-tray icon whose color reflects operational state. The full set lives under `logo/edge/tray/`:

| File | Use | Fill |
|---|---|---|
| `tray-icon.{svg,png,ico}` | Default / idle when no state is asserted yet | `#C2410C` (Edge brand auburn) |
| `tray-icon-running.{svg,png,ico}` | Healthy: tag-engine scanning, no active alarms | `#22C55E` (green) |
| `tray-icon-warning.{svg,png,ico}` | Minor / warning alarms present | `#FCD34D` (yellow, matches SCADA warning) |
| `tray-icon-down.{svg,png,ico}` | Application stopped, critical alarm, or device disconnected | `#EF4444` (red) |
| `tray-icon-template.{svg,png,ico}` | **macOS only** — solid black with alpha; NSStatusBar auto-inverts in dark mode. Never use on Windows/Linux. | `#000000` |

Raster sizes per state: PNG at 16 / 32 / 64 / 128 px (square), ICO multi-resolution (16-256 px) for Windows. The state SVGs share the NEXO "X" geometry centered in a 64×64 canvas with 6 px padding — readable down to 16 px.

The Edge runtime decides which file to load via `app.tray_handle().set_icon(...)` based on a state machine fed by the alarm and engine status streams; the brand layer just guarantees the asset family.

### Usage rules

- Use the official files from this folder. SVG preferred; PNG where raster is required.
- Preserve proportions — no stretching, skewing, rotating.
- Maintain clear space equal to the height of the "X" around the logo.
- Minimum size: **64 px** digital / **15 mm** print.
- No effects (drop shadows, bevels, glows, gradients). No recoloring outside the defined palette. No replacing the "X". No placement on busy / low-contrast backgrounds.

## Typography

- **Headings / logo wordmarks:** Poppins SemiBold
- **Body / UI:** Poppins Regular
- **Fallback:** `system-ui, sans-serif`
- **Font files:** `fonts/Poppins/` (OFL licensed, 18 variants)

**Optional brand-customizer fonts.** Products that let customers re-theme the UI ship additional self-hosted families under `fonts/<Family>/`, served at `/branding/fonts/<Family>/*.ttf`:

- **Roboto** — `fonts/Roboto/` (Apache-2.0, 3 static weights: Regular 400 / Medium 500 / Bold 700). Selectable in the NEXO Edge brand customizer. Apache-2.0 is redistributable and air-gap-safe; full text in `fonts/Roboto/LICENSE.txt`.

## Iconography

Line-based, geometric, minimal. No gradients, no shadows. Consistent stroke weight.

## Submodule integration

Clone with submodules:

```bash
git clone <repo-url>
cd <repo>
git submodule update --init --recursive
```

Update to latest branding:

```bash
cd branding
git fetch origin
cd ..
git submodule update --remote --merge
git add branding
git commit -m "chore(branding): bump submodule"
```

Do **not** edit files inside `branding/` from a parent repo — submit changes upstream in `nexo-branding`, then bump the submodule reference here.

## UI consumption

**Never hardcode hex values in product repos.** The single source of truth for every brand token is this folder. Each product UI consumes the tokens via a generated CSS file, so changing a hex here propagates everywhere on the next build.

The canonical pipeline (implemented in `nexo-hub/ui/scripts/`, mirrored by every other product UI):

1. **`link-branding.mjs`** — creates symlinks (junctions on Windows) from `ui/public/branding/{fonts,logo,exports}` to the corresponding folders inside the submodule. Lets the bundler serve raster/vector assets without copying.
2. **`build-theme.mjs`** — reads `palette/tailwind.theme.json` + `palette/tokens.json` (+ the product-specific `palette/<product>.json` when present), filters the section for the current product, and emits `ui/src/brand-generated/theme.css` exposing them as `:root { --color-<product>-* }` CSS variables.

Both scripts run on `postinstall`, `prestart`, and `prebuild` hooks in the product `ui/package.json`. The generated `ui/src/brand-generated/` and `ui/public/branding/` folders are **gitignored** — they are derived artifacts.

### Per-product consumption contract

| Product | Submodule path in product repo | Reads from `palette/` | Emits CSS vars |
|---|---|---|---|
| Hub | `branding/` | `hub` section in `tokens.json` | `--color-hub-*` |
| Charge | `branding/` | `charge` section in `tokens.json` | `--color-charge-*` |
| Edge | `nexo-branding/` | `edge` section in `tokens.json` + full `edge.json` | `--color-edge-*` |

When a product UI needs a value (button fill, focus ring, surface tint) the source path is always: `nexo-branding` JSON → `build-theme.mjs` → `brand-generated/theme.css` → `:root --color-<product>-*` → component CSS. Any product file containing a literal hex like `#C2410C` or `#06B6D4` is a drift bug.
