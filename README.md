# NEXO Branding

Official branding assets and guidelines. This folder is a git submodule pointing at the `nexo-branding` repository — edit there, not here.

## Brand essence

- **Mission:** transparency, simplicity, no hidden fees.
- **Vision:** make EV charging and infrastructure monitoring open and accessible.
- **Taglines:**
  - *NEXO Charge:* "Pay for connectors, not for kilowatts."
  - *NEXO Hub:* "Connect. Monitor. Control."

## Logo

Three variants live under `logo/`, each in SVG (preferred), PNG (256 / 512 / 1024 px), ICO (favicons), and PDF.

| Variant | Light background | Dark background |
|---|---|---|
| **Master** (mono) | `#111827` on white | white on `#111827` |
| **Charge** | `#22C55E` green (accent `#3B82F6`) | green on dark |
| **Hub** | `#06B6D4` cyan | cyan on `#0B0F17` |

Structured color values are in `palette/tokens.json`; Tailwind integration in `palette/tailwind.theme.json`.

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

The `hub-ui` scripts `scripts/link-branding.mjs` and `scripts/build-theme.mjs` link these assets into the Angular app and generate the PrimeNG preset from the palette — see [../ui/README.md](../ui/README.md).
