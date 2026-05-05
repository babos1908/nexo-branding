// =====================================================================
//  NEXO branded-document Typst template
// =====================================================================
//
//  Reusable preset for any NEXO Hub branded PDF (quickstarts, reference
//  manuals, integration playbooks). Owns page master, fonts, palette,
//  header/footer, code-block + callout helpers, and the three diagram
//  primitives (sequence diagram, topic map, state machine).
//
//  Add a new branded document by importing this template and calling
//  `nexo-doc(...)` as the show rule of your `.typ` file. See
//  `device-onboarding-quickstart.typ` for the canonical example.
//
//  The template is self-contained — no third-party Typst packages, no
//  raster fallbacks. Diagrams are drawn with Typst native primitives.

// ─── Brand palette (matches branding/palette/tokens.json) ──────────────
#let palette = (
  // Primary cyan — accent on dark, emphasis on light
  cyan-500: rgb("#06B6D4"),
  cyan-400: rgb("#22D3EE"),
  cyan-50:  rgb("#ECFEFF"),
  // Slate scale (body text + structure)
  slate-900: rgb("#0F172A"),
  slate-800: rgb("#1E293B"),
  slate-700: rgb("#334155"),
  slate-600: rgb("#475569"),
  slate-500: rgb("#64748B"),
  slate-400: rgb("#94A3B8"),
  slate-300: rgb("#CBD5E1"),
  slate-200: rgb("#E2E8F0"),
  slate-100: rgb("#F1F5F9"),
  slate-50:  rgb("#F8FAFC"),
  // Semantic
  success: rgb("#16A34A"),
  warn:    rgb("#CA8A04"),
  danger:  rgb("#DC2626"),
)

// ─── Document-level entry point ────────────────────────────────────────
//
// Apply with:  #show: nexo-doc.with(title: "...", version: "v1.0", date: "2026-05-03")
//
// `title` is shown in the per-page header (page 2+) and footer; the
// cover page is composed separately by each document via `nexo-cover`.
#let nexo-doc(
  title: "NEXO Document",
  version: "v1.0",
  date: "",
  classification: "Integration partner — confidential",
  body,
) = {
  set document(title: title)
  set page(
    paper: "a4",
    margin: (top: 22mm, bottom: 22mm, left: 18mm, right: 18mm),
    header: context {
      let pn = counter(page).get().first()
      if pn > 1 {
        // Page 2+ header: small wordmark on the left, title on the right.
        // No rule line — keeps the surface clean (Linear/Notion direction
        // per the nexo-ui-design skill §3).
        grid(
          columns: (1fr, auto),
          align: (left + horizon, right + horizon),
          // Tiny wordmark — hub light variant since the page background
          // is white. The image is sized by height; aspect ratio preserved.
          box(image("../logo/hub/svg/nexo-logo-hub-light.svg", height: 4.2mm)),
          text(size: 8pt, fill: palette.slate-500, title),
        )
      }
    },
    footer: context {
      let pn = counter(page).get().first()
      let total = counter(page).final().first()
      if pn > 1 {
        line(length: 100%, stroke: 0.4pt + palette.slate-200)
        v(2mm)
        grid(
          columns: (1fr, auto, 1fr),
          align: (left + horizon, center + horizon, right + horizon),
          text(size: 7.5pt, fill: palette.slate-500, version + " · " + date),
          text(size: 7.5pt, fill: palette.slate-500, [Page #pn / #total]),
          text(size: 7.5pt, fill: palette.slate-500, classification),
        )
      }
    },
  )

  // Body text defaults — 9.5pt with generous leading for readability.
  // Stefano feedback 2026-05-03: previous tight setting (9pt / 0.55em)
  // read as cramped technical-manual-from-2005; integrators read this
  // a few times then onboard, the document needs to invite the eye.
  set text(font: "Poppins", size: 9.5pt, fill: palette.slate-800)
  set par(leading: 0.75em, justify: false, spacing: 3mm)

  // Headings: cyan accent for h2 (the key navigation level), generous
  // breathing room above so each new section reads as a clear section
  // break, not a wall of text.
  show heading.where(level: 1): it => {
    block(below: 4mm, above: 8mm, {
      text(size: 17pt, weight: "semibold", fill: palette.slate-900, it.body)
    })
  }
  show heading.where(level: 2): it => {
    block(below: 2.5mm, above: 6mm, {
      text(size: 12pt, weight: "semibold", fill: palette.cyan-500, it.body)
    })
  }
  show heading.where(level: 3): it => {
    block(below: 1.5mm, above: 3.5mm, {
      text(size: 10pt, weight: "semibold", fill: palette.slate-700, it.body)
    })
  }

  // Inline code: monospace, light tint, same body size for legibility.
  show raw.where(block: false): it => {
    box(
      fill: palette.slate-100,
      inset: (x: 3pt, y: 1pt),
      outset: (y: 1pt),
      radius: 2pt,
      text(font: ("JetBrains Mono", "Fira Code", "Consolas", "Courier New"), size: 8.5pt, fill: palette.slate-800, it.text),
    )
  }

  // Block code: fill, padding, no border. Monospace 8.5pt with comfortable
  // padding so the snippet reads as a discrete object on the page.
  show raw.where(block: true): it => {
    block(
      fill: palette.slate-100,
      inset: 9pt,
      radius: 4pt,
      width: 100%,
      breakable: true,
      text(font: ("JetBrains Mono", "Fira Code", "Consolas", "Courier New"), size: 8.5pt, fill: palette.slate-800, it),
    )
  }

  // Tables: thin slate-200 rules, slate-100 header fill, no vertical lines.
  // Generous y-inset so rows breathe; the table reads at a glance instead
  // of as a wall of values.
  set table(
    stroke: 0.4pt + palette.slate-200,
    inset: (x: 7pt, y: 4.5pt),
  )

  // Lists: comfortable spacing between items.
  set list(indent: 4mm, spacing: 2.5mm, marker: text(fill: palette.cyan-500)[•])
  set enum(indent: 4mm, spacing: 2.5mm)

  body
}

// ─── Cover-page helper ─────────────────────────────────────────────────
//
// Produces the title block for page 1. Pure function — call it inside
// the document body to render the cover. Does NOT issue a `pagebreak()`;
// the caller decides when to break.
#let nexo-cover(
  title: "Document title",
  subtitle: "",
  version: "v1.0",
  date: "",
) = {
  // Cover band — vertical stack with breathing room. Logo top-left, then
  // title, subtitle, accent rule, metadata. ≈55 mm of page height total —
  // sets a confident first impression that doesn't crowd the body.
  v(2mm)
  image("../logo/hub/svg/nexo-logo-hub-light.svg", height: 13mm)
  v(8mm)
  block(text(size: 26pt, weight: "semibold", fill: palette.slate-900, title))
  if subtitle != "" {
    v(2.5mm, weak: true)
    block(text(size: 12pt, fill: palette.slate-600, subtitle))
  }
  v(7mm)
  // Cyan accent rule — short, anchors the title block to the body below.
  line(length: 30mm, stroke: 1.5pt + palette.cyan-500)
  v(3.5mm)
  text(size: 9pt, fill: palette.slate-500, version + "  ·  " + date)
  v(9mm)
}

// ─── Callout box helper ────────────────────────────────────────────────
//
// Cyan-tinted attention box for "must-do" notes. Use sparingly — once
// or twice per document, otherwise it loses signal value.
#let nexo-callout(title: "Note", body) = {
  block(
    fill: palette.cyan-50,
    stroke: (left: 3pt + palette.cyan-500),
    inset: (left: 12pt, right: 12pt, top: 9pt, bottom: 9pt),
    radius: (right: 4pt),
    width: 100%,
    spacing: 4mm,
    {
      text(size: 9.5pt, weight: "semibold", fill: palette.slate-900, title)
      v(2mm, weak: true)
      text(size: 9.5pt, fill: palette.slate-700, body)
    },
  )
}

// =====================================================================
//  Diagram primitives — Typst native (no third-party packages)
// =====================================================================
//
// All three diagrams are pure functions. The caller invokes them where
// they want the figure to land; layout flows around naturally.

// ─── Sequence diagram (Visual #1) ──────────────────────────────────────
//
// Vertical lifelines + horizontal message arrows. Time flows top to
// bottom. Used for the provisioning + first-telemetry handshake on
// page 1.
//
// `lanes`     — array of (string) lane labels, left-to-right
// `messages`  — array of dicts:
//                 (from: int, to: int, label: string, kind: "primary"|"return"|"local")
//                 `local` is a self-action (e.g. user clicks Accept)
#let nexo-sequence(lanes: (), messages: ()) = {
  let lane-count = lanes.len()
  let total-w = 174mm           // Roughly the printable A4 width with 18mm margins.
  let lane-w  = total-w / lane-count
  // Generous row height + label font so the diagram reads at a glance.
  let row-h   = 11mm
  let header-h = 10mm
  let total-h = header-h + messages.len() * row-h + 4mm

  block(
    width: 100%,
    height: total-h,
    breakable: false,
    {
      // Use absolute placement on a canvas-like box.
      box(width: total-w, height: total-h, {
        // ── Lane headers + lifelines ────────────────────────────────
        for (idx, name) in lanes.enumerate() {
          let cx = lane-w * (idx + 0.5)
          // Header pill
          place(
            top + left,
            dx: cx - 22mm, dy: 0mm,
            box(
              width: 44mm,
              height: 7mm,
              fill: palette.slate-100,
              radius: 3pt,
              stroke: 0.4pt + palette.slate-200,
              inset: (x: 4pt, y: 2pt),
              align(center + horizon, text(size: 9pt, weight: "semibold", fill: palette.slate-800, name)),
            ),
          )
          // Lifeline (dashed slate-300)
          place(
            top + left,
            dx: cx - 0.2pt, dy: header-h,
            line(
              length: total-h - header-h - 1mm,
              angle: 90deg,
              stroke: (paint: palette.slate-300, thickness: 0.4pt, dash: "dashed"),
            ),
          )
        }

        // ── Message arrows ─────────────────────────────────────────
        for (i, m) in messages.enumerate() {
          let y = header-h + i * row-h + row-h / 2
          let from-x = lane-w * (m.from + 0.5)
          let to-x   = lane-w * (m.to + 0.5)
          let kind   = m.at("kind", default: "primary")
          let stroke-color = if kind == "return" {
            palette.slate-400
          } else if kind == "local" {
            palette.warn
          } else {
            palette.cyan-500
          }
          let stroke-style = if kind == "return" {
            (paint: stroke-color, thickness: 0.7pt, dash: "densely-dashed")
          } else {
            (paint: stroke-color, thickness: 0.9pt)
          }

          if kind == "local" {
            // Self-loop: small rectangle on the lane lifeline.
            place(
              top + left,
              dx: from-x + 1mm, dy: y - 2mm,
              box(
                width: 26mm,
                height: 6mm,
                fill: rgb("#FEF3C7"),
                stroke: 0.5pt + palette.warn,
                radius: 2.5pt,
                inset: (x: 5pt, y: 1.5pt),
                align(left + horizon, text(size: 8pt, fill: palette.slate-800, m.label)),
              ),
            )
          } else {
            // Horizontal arrow with label centered above.
            let len = calc.abs(to-x - from-x)
            let angle = if to-x > from-x { 0deg } else { 180deg }
            let lo-x = calc.min(from-x, to-x)
            // Arrow line
            place(
              top + left,
              dx: lo-x, dy: y,
              line(length: len, angle: 0deg, stroke: stroke-style),
            )
            // Arrowhead (small triangle at the destination side).
            // Typst's `polygon(..vertices)` takes each vertex as a
            // separate positional 2-tuple — spread an array variable
            // so we don't accidentally pass a single nested tuple.
            let head-pts = if to-x > from-x {
              ((0mm, 0mm), (1.5mm, 1mm), (0mm, 2mm))
            } else {
              ((1.5mm, 0mm), (0mm, 1mm), (1.5mm, 2mm))
            }
            place(
              top + left,
              dx: if to-x > from-x { to-x - 1.5mm } else { from-x - 1.5mm },
              dy: y - 1mm,
              polygon(
                fill: stroke-color,
                stroke: none,
                ..head-pts,
              ),
            )
            // Label sits centered above the arrow. Wider box than the
            // arrow itself so longer topic strings have room. White fill
            // wipes the lifeline behind the text so it reads cleanly.
            place(
              top + left,
              dx: lo-x - 10mm, dy: y - 4.5mm,
              box(
                width: len + 20mm,
                fill: white,
                inset: (x: 3pt, y: 0pt),
                align(center, text(size: 8pt, fill: palette.slate-700, m.label)),
              ),
            )
          }
        }
      })
    },
  )
}

// ─── Topic map (Visual #2) ─────────────────────────────────────────────
//
// 4-row grid: each row shows one MQTT topic with the publisher identity
// on the left, the topic name + payload preview in the middle, and the
// QoS/retain flags on the right. Compact, scannable.
//
// `rows` — array of dicts:
//   (identity: string, direction: "pub"|"sub", topic: string,
//    note: string, qos: int, retain: bool)
#let nexo-topic-map(rows: ()) = {
  block(
    width: 100%,
    breakable: false,
    {
      table(
        columns: (32%, 5%, 50%, 13%),
        align: (left + horizon, center + horizon, left + horizon, right + horizon),
        stroke: 0.4pt + palette.slate-200,
        inset: (x: 7pt, y: 7pt),
        // Header row
        table.header(
          text(size: 9pt, weight: "semibold", fill: palette.slate-700)[Identity],
          text(size: 9pt, weight: "semibold", fill: palette.slate-700)[Dir],
          text(size: 9pt, weight: "semibold", fill: palette.slate-700)[Topic + payload preview],
          text(size: 9pt, weight: "semibold", fill: palette.slate-700)[QoS · retain],
        ),
        ..rows.map(r => {
          let dir-icon = if r.direction == "pub" {
            text(fill: palette.cyan-500, weight: "semibold", size: 11pt)[▶]
          } else {
            text(fill: palette.slate-500, weight: "semibold", size: 11pt)[◀]
          }
          let retain-str = if r.retain { "Y" } else { "N" }
          (
            text(size: 8.5pt, font: ("JetBrains Mono", "Fira Code", "Consolas"), fill: palette.slate-800, r.identity),
            dir-icon,
            stack(
              spacing: 2mm,
              text(size: 8.5pt, font: ("JetBrains Mono", "Fira Code", "Consolas"), weight: "semibold", fill: palette.slate-900, r.topic),
              text(size: 8pt, fill: palette.slate-600, r.note),
            ),
            text(size: 8.5pt, fill: palette.slate-700, "Q" + str(r.qos) + " · retain=" + retain-str),
          )
        }).flatten()
      )
    },
  )
}

// ─── State machine (Visual #3) ─────────────────────────────────────────
//
// Horizontal pill chain showing the device-side state progression.
// `states` is array of strings; arrows are drawn between consecutive.
// Optional `back-edge` (from-idx, to-idx, label) for one return arrow.
#let nexo-state-chain(states: (), back-edge: none) = {
  let n = states.len()
  let total-w = 174mm
  let pill-h = 9mm
  let pill-w = (total-w - (n - 1) * 8mm) / n
  // Row height generous enough that the back-edge sits well clear
  // of the pills (was overlapping the "connected" pill before).
  let pill-y = 0.5mm
  let backedge-y = pill-y + pill-h + 4.5mm   // clear of pill bottom
  let label-y = backedge-y - 3.5mm
  let row-h = backedge-y + 2mm

  block(
    width: 100%,
    height: row-h,
    breakable: false,
    {
      box(width: total-w, height: row-h, {
        // Pills + connecting arrows
        for (i, s) in states.enumerate() {
          let cx = i * (pill-w + 8mm)
          // Pill
          place(
            top + left,
            dx: cx, dy: pill-y,
            box(
              width: pill-w,
              height: pill-h,
              fill: palette.slate-50,
              stroke: 0.6pt + palette.cyan-500,
              radius: pill-h / 2,
              inset: (x: 4pt, y: 2pt),
              align(center + horizon, text(size: 9.5pt, weight: "semibold", fill: palette.slate-800, s)),
            ),
          )
          // Arrow to next pill
          if i + 1 < n {
            let arr-x = cx + pill-w + 0.5mm
            place(
              top + left,
              dx: arr-x, dy: pill-y + pill-h / 2,
              line(length: 7mm, stroke: 0.7pt + palette.cyan-500),
            )
            place(
              top + left,
              dx: cx + pill-w + 6mm, dy: pill-y + pill-h / 2 - 1mm,
              polygon(
                fill: palette.cyan-500,
                stroke: none,
                (0mm, 0mm), (1.5mm, 1mm), (0mm, 2mm),
              ),
            )
          }
        }

        // Optional back-edge — dashed line below the pill chain with
        // an arrowhead at the destination side. Label sits centered on
        // a white background so it cleanly interrupts the dashed line.
        if back-edge != none {
          let from-cx = back-edge.from * (pill-w + 8mm) + pill-w / 2
          let to-cx   = back-edge.to   * (pill-w + 8mm) + pill-w / 2
          let lo = calc.min(from-cx, to-cx)
          let len = calc.abs(to-cx - from-cx)
          let going-left = from-cx > to-cx
          place(
            top + left,
            dx: lo, dy: backedge-y,
            line(length: len, stroke: (paint: palette.slate-400, thickness: 0.6pt, dash: "dashed")),
          )
          // Arrowhead at the to-side
          let head-pts = if going-left {
            ((1.5mm, 0mm), (0mm, 1mm), (1.5mm, 2mm))
          } else {
            ((0mm, 0mm), (1.5mm, 1mm), (0mm, 2mm))
          }
          place(
            top + left,
            dx: if going-left { to-cx } else { to-cx - 1.5mm },
            dy: backedge-y - 1mm,
            polygon(fill: palette.slate-400, stroke: none, ..head-pts),
          )
          place(
            top + left,
            dx: lo + len / 2 - 25mm, dy: label-y,
            box(
              width: 50mm,
              fill: white,
              inset: (x: 4pt, y: 0pt),
              align(center, text(size: 8pt, fill: palette.slate-600, back-edge.label)),
            ),
          )
        }
      })
    },
  )
}
