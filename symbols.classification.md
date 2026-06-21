# NEXO Edge — SCADA Symbol Library Classification

Classification of the **1415** ABB monochrome pictogram SVGs (source: `C:\Users\Admin\Downloads\media`)
into SCADA/HMI-oriented categories for the NEXO Edge mimic-page symbol palette.

- Machine-readable data: [`symbols.classification.json`](./symbols.classification.json) — one object per file `{file, category, name, relevance, keywords}`.
- All source SVGs are `viewBox="0 0 48 48"`, root `fill="currentColor"`, `id="pictogram"` → recolor via CSS `color`.

---

## Counts per category

| Category | Count | Relevance |
|---|---:|---|
| alarms-safety | 260 | high |
| misc-decorative | 253 | low |
| automation-control | 195 | high |
| general-ui | 149 | low |
| energy-power | 135 | high |
| process-equipment | 108 | high |
| transport-logistics | 62 | medium |
| buildings-sites | 59 | medium |
| arrows-flow | 46 | high |
| industry-sectors | 42 | medium |
| measurement-instruments | 38 | high |
| status-indicators | 34 | high |
| ev-charging | 18 | high |
| tools-maintenance | 16 | medium |
| **Total** | **1415** | |

## Counts per relevance

| Relevance | Count | Categories |
|---|---:|---|
| **high** | 834 | process-equipment, automation-control, energy-power, ev-charging, arrows-flow, alarms-safety, status-indicators, measurement-instruments |
| **medium** | 179 | buildings-sites, transport-logistics, industry-sectors, tools-maintenance |
| **low** | 402 | general-ui, misc-decorative |

---

## Recolorability finding

**~95.3% of files recolor cleanly via CSS `color` (pure `currentColor`); ~4.7% (67 / 1415) do not.**

Key structural fact: nearly every file contains a `<g id="grid" display="none">` block of ~96 cyan
(`stroke="#00AEEF"` / `#0FACE4`) alignment lines. **These never render** (`display="none"`) and are *not*
visible accents — they are an export artifact. The actual `<g id="pictogram">` content is pure
`fill="currentColor"`, so these files recolor perfectly. (Example: `04_ac500.svg`, `04_pump.svg`,
`14_battery.svg` — all clean once the hidden grid is ignored.)

The genuinely non-recolorable files have **hardcoded hex fills inside the visible pictogram**:

| Cluster | Count | Colors | Note |
|---|---:|---|---|
| `09_*` ISO safety signs | 29 | `#f6bd16` yellow, `#a92121`/`#cc0000`/`#ab2323` red, `#000000`, `#ffffff` | Intentional multi-colour ISO 7010 hazard/fire signs (e.g. `09_fire_extinguisher`, `09_corrosive_substance`, `09_hot_surface`, `09_toxic_material`). Colour is semantic — do not strip. |
| `08_*` workplace pictograms | 20 | `#020203` near-black, occasional `#ffffff` | Dark "almost-black" detail fills (e.g. `08_crush_hazard`, `08_dust`, `08_welding`). Recolor poorly but visual impact is small; can be machine-normalised `#020203`→`currentColor` if desired. |
| Other (mostly `01/04/11/13`) | 18 | `#020203`, `#2B2523`, `#231F20`, `#00030A`, `#FFFFFF` | Scattered near-black/white accents (e.g. `01_paper_mill`, `04_relion`, `04_wall_charger`, `13_abb_care`, `11_paper_machine`). |

**Non-recolorable by category:** alarms-safety 44, misc-decorative 8, process-equipment 6,
automation-control 3, general-ui 3, measurement-instruments 1, energy-power 1, ev-charging 1.

**Notably non-recolorable files to be aware of (in core categories):**
`04_wall_charger.svg` (`#020203`, ev-charging), `04_relion.svg` (`#020203`, energy/protection),
`04_actuator.svg` / `04_smi_actuator.svg` (`#2B2523` / `#FFFFFF`), `04_paper_winder.svg` (`#2C2522`),
`04_qcs_scanner.svg` / `04_paper_testing_instrument.svg` (`#2B2523`), and the whole `09_fire_*` set
(`fire_extinguisher`, `fire_hose_reel`, `fire_ladder`, `fire_alarm_call_point`, `fire_emergency_telephone`).

**Recommendation:** ship as-is — the 4.7% is dominated by intentionally-coloured ISO safety signs (which
*should* keep their colour) plus near-black detail fills. If a strictly-monochrome palette is required, a
one-line build step normalising `#020203`/`#2B2523`/`#231F20`/`#00030A` → `currentColor` would recover
~18 of the 67 without touching the semantic ISO colours.

---

## Recommended core bundle

The "high" tier is 834 symbols, but it is inflated by (a) 155 ISO-safety wayfinding signs and (b) ~73
ABB-product-SKU icons in automation-control (catalog-specific: `04_ac500`, `04_yumi`, `04_relion`, …) that
carry low *generic* SCADA value. The recommendation is a **two-tier ship**:

### Tier 1 — bundled core (~448 symbols) — ship inside the app

The everyday mimic-building vocabulary: every process/energy/EV/flow/measurement/status symbol plus the
operational alarm subset, **excluding** ABB-SKU-specific catalog icons and ISO wayfinding bulk.

| Category | In core | Notes |
|---|---:|---|
| process-equipment | 108 | all |
| energy-power (generic) | 99 | drops ~36 ABB SKUs (relion/unitrol/megatrol/vd4/emax/tmax…) |
| ev-charging | 18 | all (flagship NEXO domain) |
| arrows-flow | 46 | all |
| measurement-instruments | 38 | all |
| status-indicators | 34 | all |
| alarms-safety (operational) | 105 | alarm/fire/PPE/emergency icons; drops 155 ISO wayfinding signs |
| **Tier-1 total** | **448** | within the 250–450 target |

### Tier 2 — recommended add-on, optional import (~212 symbols)

- **automation-control – generic** (~122): PLC/controller/HMI/robot/IO/network primitives — high value, but
  large; lazy-load as a second pack.
- **automation-control – ABB SKUs + energy ABB SKUs** (~73 + ~36 ≈ 109): ship as an **"ABB product
  symbols"** optional pack for sites that mimic specific ABB hardware.

### Tier 3 — optional import on demand (everything else)

- **medium** (179): buildings-sites, transport-logistics, industry-sectors, tools-maintenance.
- **low** (402): general-ui, misc-decorative (food/beverage, nature, office, people, city skylines).
- **ISO safety wayfinding** (~155 of alarms-safety): the full ISO 7010 set as a dedicated "Safety signs" pack.

This keeps the bundled palette fast and SCADA-focused (~448 symbols) while leaving the long tail a
one-click import away.

---

## ~12 high-value example symbols per core category

### process-equipment
Pump · Motor Pump · Compressor · Way Mixing Valve · Centrifuge · Boiler · Chiller · Heat Pump ·
Chiller Compressor · Mining Conveyor · Separator · Concrete Mixer

### automation-control
AC500 · PLC Controller · Controller · CP600 · Servo Drive · Robot · YuMi · Remote IO · Modem ·
DIN Rail · Control Panel · Frequency Drives

### energy-power
Transformer · MV Switchgear · Circuit Breaker · Capacitor · Inverter · Battery · Solar Panel ·
Power Grid · Main Substation · Windmill · Turbine On · Fuses

### ev-charging
DC Charger · Wall Charger · Opportunity Charger · Power Charger · E Car · Charging Bus · E Mobility ·
Plug · Socket · Tosa Bus · Formula E · Electric Trolley

### arrows-flow
Arrow Right · Arrow Left · Arrows Converge · Arrows Split · Arrows Circle · Current Flow ·
Chart Increasing · Chart Decreasing · Chart Bars · Increase · Levels · Rotate 3D

### alarms-safety
Danger · Attention · Bell Alarm · Alarm Signal · Siren · Fire Alarm · Fire Extinguisher ·
Emergency Exit · Electrical Hazard · Skull · Stop · First Aid

### status-indicators
Traffic Light · Signal · WiFi · Bluetooth · Power Button · Padlock Closed · Padlock Open ·
System Status · Smart Sensor · Presence Detector · Fingerprint · Key Card

### measurement-instruments
Gauge · Thermometer · Temperature Sensor · Pressure Sensor · Flow Meter · Meter · Voltage Sensor ·
Current Measurement · Measuring Tape · Smoke Detector · Weather Sensor · Field Instrument
