# NEXO Branded Integration Documents

This folder hosts the **Typst source** for branded PDFs that go to
third-party integrators (PLC vendors, software companions). The PDFs
themselves are not version-controlled — `dist/` is gitignored — they
rebuild deterministically from the `.typ` sources.

## Files

| File | Purpose |
|------|---------|
| `_template.typ` | Reusable template — page master, fonts, palette, header/footer, code-block + callout helpers, and the three diagram primitives (`nexo-sequence`, `nexo-topic-map`, `nexo-state-chain`). Every branded document imports this. |
| `device-onboarding-quickstart.typ` | The 3-page onboarding quickstart. PLC integrator + application developer side-by-side. |
| `dist/` | Build output (gitignored). |

## Build

From the **repo root**:

```bash
node scripts/build-branding-pdf.mjs branding/integration/device-onboarding-quickstart.typ
```

The script:

- Resolves the source path.
- Adds `branding/fonts/Poppins/` to the Typst font search path so
  Poppins is picked up regardless of what's installed on the host.
- Writes `branding/integration/dist/<doc-name>.pdf`.
- Prints a friendly install hint if the `typst` CLI is missing.

### Prerequisites

- `typst` CLI on PATH. Install:
  - Windows: `winget install --id Typst.Typst`
  - macOS: `brew install typst`
  - Linux: `cargo install --locked typst-cli` (or distro package)
- The `branding` submodule initialised (Poppins fonts + Hub logo SVG
  must be present). From the repo root: `git submodule update --init`.

That's it. No npm dependencies, no chrome/puppeteer, no LaTeX.

## Adding a new branded document

1. Create `branding/integration/<doc-slug>.typ`.
2. First two lines:
   ```typst
   #import "_template.typ": nexo-doc, nexo-cover, nexo-callout, nexo-sequence, nexo-topic-map, nexo-state-chain, palette
   #show: nexo-doc.with(title: "...", version: "v1.0", date: "2026-XX-XX")
   ```
3. Compose the body. Use `#nexo-cover(...)` for the title block,
   `#nexo-callout(...)` for must-do attention boxes, `#nexo-sequence(...)`
   / `#nexo-topic-map(...)` / `#nexo-state-chain(...)` for diagrams.
4. Build: `node scripts/build-branding-pdf.mjs branding/integration/<doc-slug>.typ`.

## Style spec

The template enforces:

- **Page**: A4 portrait, 22 mm top/bottom margins, 18 mm left/right.
- **Fonts**: Poppins SemiBold (headings, wordmark), Poppins Regular
  (body), monospace fallback `JetBrains Mono → Fira Code → Consolas →
  Courier New` (code blocks).
- **Palette**: cyan accent `#06B6D4` for headings + key rules; slate
  scale for everything else; semantic green/amber/red for callouts.
- **Logo**: NEXO Hub light variant from `branding/logo/hub/svg/`,
  rendered as vector — never raster.
- **Headers/footers**: clean, no rule lines on the header; thin
  slate-200 rule on the footer with version + page number +
  classification.

Any deviation should be discussed against the `nexo-ui-design` skill
(`nexo-hub/.claude/skills/nexo-ui-design/SKILL.md`) first, since the
print branding follows the same Linear/Notion-inspired direction as the
SPA.

## Why Typst

- **Hermetic**: a single CLI dependency; no LaTeX, no Chromium.
- **Editable diagrams**: sequence diagram, topic map and state machine
  are Typst code — they version-control and diff like any other text.
- **Fast**: full rebuild < 1 s on the quickstart.
- **Apache-2.0 licensed**, OFL fonts. No proprietary dependencies.

## Future documents (planned)

- Full **integration reference manual** — extends the quickstart with
  command subscription, heartbeat / LWT, alert-rule integration, OTA
  channel, advanced tag metadata, full troubleshooting matrix.
- **Tenant-admin user onboarding** — separate from device onboarding;
  walks a new tenant-admin through their first login, password reset,
  inviting users, accepting a device.

Both reuse `_template.typ` directly.
