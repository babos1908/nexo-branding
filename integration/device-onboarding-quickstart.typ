// =====================================================================
//  NEXO Hub — Device Onboarding Quickstart
// =====================================================================
//
//  Audience:   PLC integrators (NexoMqttLib V3 on ABB AC500) AND
//              generic application developers (any MQTT-capable client).
//  Scope:      provisioning handshake → tag schema → first telemetry.
//              Out of scope: commands, OTA, alerts, mTLS roadmap.
//  Length:     3 pages (A4 portrait).
//  Builds via: node scripts/build-branding-pdf.mjs branding/integration/device-onboarding-quickstart.typ
//
//  Source of truth for every payload below: cross-checked 2026-05-03
//  against `api/src/mqtt/mqtt.service.ts`,
//  `api/src/provisioning/provisioning.service.ts`, and
//  `api/src/simulator/simulator-{worker,protocol,tags}.ts`.

#import "_template.typ": nexo-doc, nexo-cover, nexo-callout, nexo-sequence, nexo-topic-map, nexo-state-chain, palette

#show: nexo-doc.with(
  title: "Device Onboarding — Quickstart",
  version: "v1.0",
  date: "2026-05-03",
)

// ─── PAGE 1 ─ Cover + prerequisites + sequence diagram ────────────────

#nexo-cover(
  title: "Device Onboarding",
  subtitle: "Quickstart — integrate a PLC or application onto NEXO Hub",
  version: "v1.0",
  date: "2026-05-03",
)

A PLC or application onboards in a *two-actor flow*: the device
announces itself on MQTT, a tenant-admin presses Accept in the Hub UI,
the device receives credentials and begins publishing.
≈ 10 minutes end-to-end.

== Prerequisites

- Tenant exists; your tenant-admin user can log in at `https://app.nexohub.xyz/`.
- You received *bootstrap MQTT credentials* OOB from your Nexo onboarding contact.
- Device reaches `mqtts://mqtt.nexohub.xyz:8883` (TLS, TCP 8883, Let's Encrypt server cert).
- Unique serial — 1–64 chars, no spaces, no MQTT wildcards (`+`, `#`, `/`).
- ABB AC500: NexoMqttLib V3 imported in CoDeSys (Automation Builder ≥ 2.9).

== Handshake at a glance

// Sequence semantics: the broker is the MQTT transport, not the logical
// peer. Arrows show the *logical* source → destination of each message
// and cross the Broker lane visually. Exception: ⑤ "reconnect" stops at
// the Broker lane because it's an MQTT CONNECT (the broker is the
// actual peer for the auth handshake — the Hub only sees it indirectly
// via the auth-plugin webhook).
#nexo-sequence(
  lanes: ("Device", "Broker", "Hub", "Admin"),
  messages: (
    (from: 0, to: 2, label: [① `provisioning/request`], kind: "primary"),
    (from: 2, to: 0, label: [② `response = pending`], kind: "return"),
    (from: 3, to: 3, label: [③ Accept in UI]),
    (from: 2, to: 0, label: [④ `response = accepted` + credentials], kind: "return"),
    (from: 0, to: 1, label: [⑤ reconnect (mqttUser/mqttPass)], kind: "primary"),
    (from: 0, to: 2, label: [⑥ `devices/<id>/register` — tag schema], kind: "primary"),
    (from: 0, to: 2, label: [⑦ `devices/<id>/telemetry` — cyclic], kind: "primary"),
  ),
)

#nexo-callout(
  title: "Two-actor handshake",
  [Credentials are *not* automatic — a human tenant-admin presses
  *Accept* on the pending row in the Hub UI (`Devices` page).
  ~1 min of operator time per onboarding.],
)


// ─── PAGE 2 ─ Step 1 + Step 2 ─────────────────────────────────────────

#pagebreak()

= Step 1 — Announce the device

== Connection (bootstrap)

#table(
  columns: (28%, 72%),
  align: (left + horizon, left + horizon),
  table.header(
    text(size: 8pt, weight: "semibold", fill: palette.slate-700)[Field],
    text(size: 8pt, weight: "semibold", fill: palette.slate-700)[Value],
  ),
  [Broker URL],   [`mqtts://mqtt.nexohub.xyz:8883` (TLS, Let's Encrypt cert)],
  [MQTT version], [v5, QoS 1 throughout],
  [Username],     [`nexo-bootstrap`],
  [Password],     [_provided OOB by your Nexo onboarding contact_],
  [Client ID],    [`nexo-prov-<serial>-<epoch-ms>` (unique per attempt)],
)

Auth today is username/password under TLS (mosquitto-go-auth). A future
release migrates to per-device X.509 client certificates — broker URL
and topics stay the same; only the credential format your device
receives changes (`{mqttUser, mqttPass}` → `{deviceCert, devicePrivateKey}`).

#nexo-callout(
  title: "Subscribe BEFORE publishing",
  [`provisioning/response/<serial>` is *not retained*. Publish the
   request after the SUBACK or you wait forever on `pending`.],
)

== Publish the identity

Topic `provisioning/request` · QoS 1 · retain=N. Field names are
camelCase, matching the rest of the NEXO JSON API.

#grid(
  columns: (1fr, 1fr),
  column-gutter: 4mm,
  ```json
  {
    "serial": "00001743",
    "type": "plc",
    "model": "PM5650-2ETH",
    "firmware": "3.9.0",
    "manufactureDate": "2126",
    "protocol": "mqtt"
  }
  ```,
  ```st
  fbProvisioning(
      Serial          := '00001743',
      DeviceType      := 'plc',
      Model           := 'PM5650-2ETH',
      Firmware        := '3.9.0',
      ManufactureDate := '2126',
      Execute         := TRUE
  );
  ```,
)

*Valid `type`*: `plc` (industrial controller) or `app` (software
companion). Lowercase. Default `plc`. *Rate limit*: 6 req / 5 min / serial.

== Expected response (`provisioning/response/<serial>`)

Hub answers twice — first an immediate `{"status":"pending"}`, then,
after the tenant-admin presses Accept:

```json
{
  "status": "accepted",
  "deviceId": "01JZK7...",
  "tenantId": "acme",
  "apiKey": "nexo_a1b2c3...",
  "mqttUser": "01JZK7...",
  "mqttPass": "nexo_a1b2c3...",
  "telemetryInterval": 30
}
```

`mqttUser === deviceId`, `mqttPass === apiKey`. `telemetryInterval` is
the suggested floor in seconds; any cadence ≥ this is fine.

= Step 2 — Register the tag schema

Persist credentials (RETAIN on PLC, secure store on application), then
reconnect: username = `mqttUser`, password = `mqttPass`, client ID =
`nexo-<deviceId>`.

Publish *once* on `devices/<deviceId>/register` (QoS 1, *retain=Y* so
the schema survives broker restarts):

```json
{ "tags": [ { "name": "voltage_l1_v", "type": "numeric", "unit": "V",
              "min": 0, "max": 400, "description": "Phase L1 voltage" },
            ... ] }
```

`type` is `"numeric"` or `"boolean"` (string literal — *not* IEC
`REAL`/`DINT`). `unit` may be `""` (unitless ratios). `max` may be
`null` (unbounded counters). Booleans add `labelOn` / `labelOff` for
human-readable state. NexoMqttLib: `FB_NexoTelemetry.RegisterTags(...)`
at startup. The full reference schema is below.

= Tag-schema reference

The default 20-tag schema the in-process simulator publishes
(`industriale` template) — a sound starting point for a three-phase
meter + I/O package. Customize names, ranges, and units for your
hardware; keep the shape.

#set text(size: 8.5pt)
#set table(inset: (x: 7pt, y: 4pt))
#block(breakable: false, table(
  columns: (22%, 11%, 8%, 14%, 45%),
  align: (left + horizon, left + horizon, left + horizon, left + horizon, left + horizon),
  table.header(
    text(weight: "semibold", fill: palette.slate-700)[name],
    text(weight: "semibold", fill: palette.slate-700)[type],
    text(weight: "semibold", fill: palette.slate-700)[unit],
    text(weight: "semibold", fill: palette.slate-700)[range],
    text(weight: "semibold", fill: palette.slate-700)[description],
  ),
  raw("current_l1_a"),    raw("numeric"), raw("A"),     raw("0–40"),    [Phase L1 current],
  raw("current_l2_a"),    raw("numeric"), raw("A"),     raw("0–40"),    [Phase L2 current],
  raw("current_l3_a"),    raw("numeric"), raw("A"),     raw("0–40"),    [Phase L3 current],
  raw("voltage_l1_v"),    raw("numeric"), raw("V"),     raw("0–400"),   [Phase L1 voltage],
  raw("voltage_l2_v"),    raw("numeric"), raw("V"),     raw("0–400"),   [Phase L2 voltage],
  raw("voltage_l3_v"),    raw("numeric"), raw("V"),     raw("0–400"),   [Phase L3 voltage],
  raw("power_kw"),        raw("numeric"), raw("kW"),    raw("0–22"),    [Active power],
  raw("power_factor"),    raw("numeric"), raw(""),      raw("0–1"),     [Power factor],
  raw("frequency_hz"),    raw("numeric"), raw("Hz"),    raw("49–51"),   [Grid frequency],
  raw("energy_kwh"),      raw("numeric"), raw("kWh"),   raw("0–∞"),     [Accumulated energy],
  raw("run_hours"),       raw("numeric"), raw("h"),     raw("0–∞"),     [Accumulated run hours],
  raw("temp_panel_c"),    raw("numeric"), raw("°C"),    raw("-10–80"),  [Panel temperature],
  raw("temp_ambient_c"),  raw("numeric"), raw("°C"),    raw("-20–60"),  [Ambient temperature],
  raw("ai_pressure_bar"), raw("numeric"), raw("bar"),   raw("0–16"),    [Pressure sensor],
  raw("ai_flow_lpm"),     raw("numeric"), raw("l/min"), raw("0–100"),   [Flow rate],
  raw("di_run"),          raw("boolean"), raw(""),      raw("0/1"),     [Run command (Running/Stopped)],
  raw("di_fault"),        raw("boolean"), raw(""),      raw("0/1"),     [Fault indicator (Fault/OK)],
  raw("di_door_open"),    raw("boolean"), raw(""),      raw("0/1"),     [Door sensor (Open/Closed)],
  raw("do_motor_run"),    raw("boolean"), raw(""),      raw("0/1"),     [Motor relay (ON/OFF)],
  raw("do_fault_relay"),  raw("boolean"), raw(""),      raw("0/1"),     [Fault relay (Tripped/Normal)],
))
#set table(inset: (x: 7pt, y: 4.5pt))
#set text(size: 9.5pt)

// ─── PAGE 3 ─ Tag-schema reference + Step 3 + verify + topic map ──────

#pagebreak()

= Step 3 — Stream telemetry

Topic `devices/<deviceId>/telemetry` · QoS 1 · retain=N. Publish at
your chosen cadence (typical 5–30 s).

```json
{
  "timestamp": "2026-05-03T12:00:00.000Z",
  "points": [
    { "tag": "voltage_l1_v", "value": 230.4, "quality": 1 },
    { "tag": "current_l1_a", "value": 12.7,  "quality": 1 },
    { "tag": "di_run",       "value": 1,     "quality": 1 }
  ]
}
```

- `point.tag` *must* match a name registered in Step 2. Unknown names
  drop silently.
- `quality`: `1`=good, `0`=bad (broken source), `2`=uncertain (stale).
  Hub UI greys out non-good points.
- `timestamp`: ISO-8601 UTC. Hub stamps server-side if omitted; device
  stamps preserve event order under jitter.
- NexoMqttLib: `FB_NexoTelemetry.Push(...)` per cycle.

*Verify* — log in at `https://app.nexohub.xyz/` → `Devices` → your
device → *Live* tab. Each tag updates ≤ 1 s after publish.

== Topic map

#nexo-topic-map(rows: (
  (
    identity:  "nexo-bootstrap",
    direction: "pub",
    topic:     "provisioning/request",
    note:      "one-shot identity announcement",
    qos: 1, retain: false,
  ),
  (
    identity:  "nexo-bootstrap",
    direction: "sub",
    topic:     "provisioning/response/<serial>",
    note:      "must subscribe BEFORE publishing the request",
    qos: 1, retain: false,
  ),
  (
    identity:  "<deviceId> / <apiKey>",
    direction: "pub",
    topic:     "devices/<deviceId>/register",
    note:      "tag schema — once at boot; retain=Y so it persists",
    qos: 1, retain: true,
  ),
  (
    identity:  "<deviceId> / <apiKey>",
    direction: "pub",
    topic:     "devices/<deviceId>/telemetry",
    note:      "cyclic data stream",
    qos: 1, retain: false,
  ),
))

== Device state machine (NexoMqttLib parity)

#nexo-state-chain(
  states: ("idle", "provisioning", "connecting", "connected", "reconnecting"),
  back-edge: (from: 4, to: 2, label: [broker drop → re-auth]),
)

== Troubleshooting

#table(
  columns: (24%, 30%, 46%),
  table.header(
    text(weight: "semibold", fill: palette.slate-700)[Symptom],
    text(weight: "semibold", fill: palette.slate-700)[Likely cause],
    text(weight: "semibold", fill: palette.slate-700)[Fix],
  ),
  [Stuck on `pending` indefinitely],
  [Tenant-admin hasn't pressed Accept yet],
  [Ping your tenant-admin — they see a pending row in `Devices`.],

  [Auth fails *after* credentials received],
  [Wrong client_id or stale TLS handshake],
  [Reconnect cleanly; username = `mqttUser`, not the bootstrap user.],

  [Telemetry publishes OK but no Live data],
  [Tag name not in registered schema],
  [Re-publish `devices/<deviceId>/register` with the missing tag.],
)
