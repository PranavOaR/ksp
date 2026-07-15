# DRISHTI — KSP Crime Intelligence Copilot 

> ದೃಷ್ಟಿ (*Drishti*, "vision") — **D**ata-driven **R**apid **I**nvestigation & **S**trategic **H**olistic **T**hreat **I**ntelligence

An AI-powered investigative intelligence platform for Karnataka State Police: natural-language access to crime records, criminal network discovery, offender risk profiling, hotspot detection, crime forecasting, and sociological intelligence — with explainable, evidence-backed, fully audited answers.

**All data in this repository is synthetic**, generated deterministically for demonstration. No real crime records, people, or identifiers are used.

## Quick start (3 steps)

```bash
git clone https://github.com/PranavOaR/ksp.git
cd ksp && npm install
npm run dev        # → http://localhost:3000
```

The SQLite database (`data/drishti.db`) is created and seeded automatically on first request — **480 FIRs, 220 persons, 5 planted crime rings**, assets, and transactions across 10 Karnataka districts (2024-01 → 2026-06).

## Official KSP schema alignment

DRISHTI's database implements the official **Police FIR System ER diagram**: every entity
(`CaseMaster`, `Accused`, `Victim`, `ComplainantDetails`, `ArrestSurrender`, `ChargesheetDetails`,
`Act`/`Section`/`CrimeHead`, `Unit`/`UnitType`/`Rank`/`Employee`, …) exists with its official
name and columns — `SELECT * FROM CaseMaster` returns the official shape, and case numbers use
the real 18-digit CrimeNo format (`104430006202600001`). On top of the official per-case model we
add an **entity-resolution layer** (global `persons` + `resolved_person_id` links) — the official
schema has no cross-case identity, and this layer is what makes repeat-offender and network
intelligence possible. Full column-level mapping and rationale: [`docs/schema-mapping.md`](docs/schema-mapping.md).

## Demo accounts

Logins are mapped to the official rank/unit hierarchy; district postings scope data access
(visible as a "Scoped to your jurisdiction" line in Copilot reasoning trails).

| Role | Username | Password | Rank · Posting | Data scope |
|---|---|---|---|---|
| **Investigator** | `investigator` | `drishti123` | PSI · Bengaluru City East PS | Bengaluru City |
| **Analyst** | `analyst` | `drishti123` | PI · State Crime Records Bureau | Statewide (+ Financial Intel) |
| **Supervisor** | `supervisor` | `drishti123` | SP · Bengaluru City District | Bengaluru City (+ Audit, status updates) |
| **Administrator** | `admin` | `drishti123` | DGP · State Police HQ | Statewide, full access |

> **To enable Claude-powered Copilot:** put `ANTHROPIC_API_KEY=sk-ant-...` in `.env.local` (gitignored). Without a key the Copilot uses the offline rule engine — every response is badged with the engine that produced it.

## Module map

| Module | What it does | Where |
|---|---|---|
| **A — Natural language** | 12 query intents (cases, people, networks, sections, hotspots, finance…); Claude + offline rule engine in parity | `src/lib/intel/llm.ts`, `queryParser.ts` |
| **A′ — Investigation agent** | "Investigate ⟨name⟩" autonomously chains 8 intel tools into a lead memo with a live step trace | `src/lib/intel/agent.ts`, `/copilot` |
| **A6 — Knowledge base** | Legal/procedure questions answered from real BNS/IT/NDPS section text + SOPs (FTS5 retrieval, cited) | `src/lib/intel/knowledge.ts` |
| **B — Network intel** | 2–3-hop BFS across persons, FIRs, phones, vehicles; crime ring detection | `src/lib/intel/network.ts`, `gangs.ts` |
| **C — Analytics + map** | Temporal/geographic/MO analytics; interactive Karnataka-only crime-density map (OSM basemap, state-boundary mask, canvas-rendered) with emerging-hotspot and 3-month forecast layers | `src/lib/intel/hotspots.ts`, `/map` |
| **D — Sociology** | Crime rates correlated with 2011 Census literacy & urbanisation; social-risk score per district | `src/lib/intel/sociology.ts`, `src/lib/data/census.ts` |
| **E — Offenders** | Repeat-offender register; explainable risk score (priors + network + recency + versatility) | `src/lib/intel/riskScoring.ts` |
| **F — Case intel** | Auto case summary, timeline, similar-case retrieval, investigative leads | `src/lib/intel/caseIntel.ts` |
| **G — Financial** | Money-trail graph with circular-transfer (layering) ring detection, high-value transaction leads, dedicated Financial Intel page | `src/lib/intel/financial.ts`, `/financial` |
| **H — Forecasting** | Least-squares 3-month forecast; emerging-hotspot early-warning alerts | `src/lib/intel/forecast.ts` |
| **I — Explainable AI** | Evidence FIR refs, reasoning trail, confidence score on every Copilot response | `/copilot` response cards |
| **J — Governance** | RBAC on the official rank/unit hierarchy with jurisdiction scoping; every query, view and export audit-logged | `src/lib/scope.ts`, `audit.ts` |

```bash
npm test                    # vitest unit + integration suites (159 tests)
npx vitest run --coverage   # coverage report (~90% stmts on the intel core)
npm run build && npm start  # production build (set AUTH_SECRET — required in production)
```

## What's implemented (PRD module map)

| PRD module | Feature | Where |
|---|---|---|
| **A1** Natural-language querying | **Claude API** (`claude-haiku-4-5`, structured outputs) translates free-form questions into validated query filters across 12 intents — cases, counts, trends, person profiles, case detail (incl. 18-digit CrimeNo), networks, money trail, legal sections, hotspots; deterministic rule-engine parser in full parity as automatic offline fallback | `src/lib/intel/llm.ts`, `queryParser.ts`, `/copilot` |
| **A′** Investigation agent | *"Investigate Ravi Kumar"* autonomously chains resolve → priors → 2-hop network → risk score → similar-MO cases → financial links → geography → drafted lead memo, with a step-by-step trace (real durations, FIR evidence per step) | `src/lib/intel/agent.ts`, `/copilot` |
| **A6** Knowledge-base answers | Legal/procedure questions ("what section applies to chain snatching?") answered from real BNS 2023 / IT Act / NDPS / Arms Act section text + BNSS SOPs via SQLite FTS5 retrieval; Claude-composed with mandatory citations, extractive offline fallback, badged "⚖ Knowledge base answer" | `src/lib/intel/knowledge.ts`, migration v3 |
| **A2** Context retention | Follow-ups like *"Only solved cases"* merge into the previous filter (both engines) | `llmCoerce.ts` / `isRefinement` logic |
| **A3** Kannada support | Ask in ಕನ್ನಡ, get answers in ಕನ್ನಡ grounded in real database results (English fields like FIR numbers preserved) | `llm.ts` language detection + compose |
| **A4** Voice interface | Speak questions (English/Kannada) via the browser SpeechRecognition API; answers read back with speech synthesis | `src/components/copilot/useVoice.ts` |
| **A5** Conversation export | CSV and PDF export with queries, answers, confidence, evidence refs, timestamps | `/copilot` → Export CSV / PDF |
| **B1/B3** Network graph + entity explorer | 2–3-hop BFS across persons, FIRs, phones, vehicles, bank accounts; custom SVG force layout with wheel zoom, drag-pan and reset (shared by the Financial money-trail graph) | `src/lib/intel/network.ts`, `/network` |
| **B2** Organized crime detection | Union-find clustering of repeat co-accused → crime rings (recovers all 5 seeded gangs) | `src/lib/intel/gangs.ts` |
| **C1/C2** Temporal + geographic analytics | Monthly trend, hour-of-day, district and crime-type breakdowns | `/analytics` |
| **C3/H3** Hotspot detection + density map | Intensity ranking + emerging-cluster flags (quarter-over-quarter growth), rendered as an interactive geographic density map masked to Karnataka's real GADM boundary, with a per-district **3-month forecast overlay** (dashed = predicted growth/decline) | `src/lib/intel/hotspots.ts`, `/map` |
| **C4** MO serial patterns | FIRs sharing an identical modus operandi clustered as potential serial offenders; banner on case detail | `src/lib/intel/moClusters.ts`, `/analytics` |
| **D** Sociological intelligence | District crime rates correlated (Pearson) with 2011 Census literacy & urbanisation; explainable social-risk score | `src/lib/intel/sociology.ts`, `/sociology` |
| **E1–E3** Offender profiling + risk scoring | Repeat-offender register; explainable weighted score (priors, network degree, recency, versatility) → Low/Medium/High | `src/lib/intel/riskScoring.ts`, `/offenders` |
| **F1–F4** Investigator decision support | Auto case summary, timeline, similar-case retrieval (MO/type/location), suggested leads incl. financial referrals | `src/lib/intel/caseIntel.ts`, `/cases/[id]` |
| **G1–G3** Financial intelligence | Money-trail graph visualization, circular-transfer (layering) ring detection, high-value transaction leads on case pages + dedicated Financial page | `src/lib/intel/financial.ts`, `/financial`, `caseIntel.ts` |
| **H1–H3** Forecasting + early warning | Least-squares 3-month forecast; emerging-hotspot alerts on the overview | `src/lib/intel/forecast.ts`, `/`, `/analytics` |
| **I1–I3** Explainable AI | Every answer carries evidence (FIR numbers), a reasoning trail, and a confidence score | `/copilot` response cards |
| **J1** Hierarchy RBAC | Logins mapped to official Rank/Unit postings (PSI → DGP); district-posted officers get jurisdiction-scoped answers with the scoping shown in the reasoning trail; role tags every audit row | `src/lib/scope.ts`, top bar |
| **J2** Audit logging | Every query, view, and export logged | `src/lib/audit.ts`, `/audit` |

To enable the Claude-powered Copilot, put `ANTHROPIC_API_KEY=sk-ant-...` in `.env.local` (gitignored). Without a key the Copilot transparently uses the offline rule engine — every response is badged with the engine that produced it.

Not yet built (honest gaps): Hindi/Tamil/Telugu (A3 lists them as future languages — Kannada is fully supported), and hardened production auth (JWT/SSO — the demo uses session-cookie RBAC-lite).

## Architecture

```
src/
├── app/                # Next.js App Router
│   ├── api/            # chat, analytics, map, network, offenders, cases, overview, audit
│   └── (pages)         # /, /copilot, /map, /network, /analytics, /offenders, /cases, /audit
├── components/         # UI: sidebar, charts (Recharts), Leaflet density map,
│                       # SVG network graph, copilot cards incl. agent trace
└── lib/
    ├── db/             # better-sqlite3 client, official-schema migrations + views,
    │                   # deterministic seeder, legal lookups/KB corpus
    ├── intel/          # PURE intelligence core — parser, executor, agent, risk,
    │                   # hotspots, forecast, gangs, network, knowledge, case intel
    ├── scope.ts        # J1 jurisdiction scoping
    └── audit.ts        # J2 audit logging
```

Design notes:

- **Intelligence core is pure and DB-agnostic where possible** — parser, risk scorer, hotspot detector, forecaster, and ring detector take plain data in and return plain data out, so they're unit-tested without any database.
- **Seeded RNG** (`mulberry32`) makes the demo dataset identical on every machine; official-schema data (v2) draws from a second stream so the base dataset never shifts across migrations.
- **API envelope** is uniform: `{ success, data, error }`; failures log server-side and return generic messages.
- Chart palette follows a CVD-validated dark-mode palette (all contrast/colorblind checks pass).
- **Public landing is a single scrolling page** — Platform, Modules and Security are sections on `/` with smooth-scroll navbar anchors; the old `/platform`, `/modules`, `/security` routes redirect to their anchors.
- **Scale & latency**: the architecture is reasoned for 1–2 lakh cases with an explicit latency budget — see [`docs/scalability.md`](docs/scalability.md).

## Demo script

The full 2-minute walkthrough (landing → login → Copilot in English, Kannada and voice → network rings → financial intel → live workspace → audit) lives in [`docs/demo-script.md`](docs/demo-script.md). The system architecture and Copilot data flow are documented in [`docs/architecture.md`](docs/architecture.md).
