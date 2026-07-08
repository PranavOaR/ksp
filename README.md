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

## Demo accounts

| Role | Username | Password | Access |
|---|---|---|---|
| **Investigator** | `investigator` | `drishti123` | Copilot, Cases, Network, Offenders, Analytics, Sociology |
| **Analyst** | `analyst` | `drishti123` | + Financial Intel |
| **Supervisor** | `supervisor` | `drishti123` | + Audit trail, case status updates |
| **Administrator** | `admin` | `drishti123` | Full access |

> **To enable Claude-powered Copilot:** put `ANTHROPIC_API_KEY=sk-ant-...` in `.env.local` (gitignored). Without a key the Copilot uses the offline rule engine — every response is badged with the engine that produced it.

## Module map

| Module | What it does | Where |
|---|---|---|
| **A — Natural language** | Translate questions to query filters; Claude + offline rule engine fallback | `src/lib/intel/llm.ts`, `queryParser.ts` |
| **B — Network intel** | 2–3-hop BFS across persons, FIRs, phones, vehicles; crime ring detection | `src/lib/intel/network.ts`, `gangs.ts` |
| **C — Analytics** | Temporal, geographic, hotspot, and MO serial-pattern intelligence | `src/lib/intel/hotspots.ts`, `moClusters.ts` |
| **D — Sociology** | Crime rates correlated with 2011 Census literacy & urbanisation; social-risk score per district | `src/lib/intel/sociology.ts`, `src/lib/data/census.ts` |
| **E — Offenders** | Repeat-offender register; explainable risk score (priors + network + recency + versatility) | `src/lib/intel/riskScoring.ts` |
| **F — Case intel** | Auto case summary, timeline, similar-case retrieval, investigative leads | `src/lib/intel/caseIntel.ts` |
| **G — Financial** | Money-trail graph with circular-transfer (layering) ring detection, high-value transaction leads, dedicated Financial Intel page | `src/lib/intel/financial.ts`, `/financial` |
| **H — Forecasting** | Least-squares 3-month forecast; emerging-hotspot early-warning alerts | `src/lib/intel/forecast.ts` |
| **I — Explainable AI** | Evidence FIR refs, reasoning trail, confidence score on every Copilot response | `/copilot` response cards |
| **J — Governance** | RBAC-lite role switcher; every query, view and export audit-logged | `src/lib/audit.ts`, `authShared.ts` |

```bash
npm test                    # vitest unit + integration suites
npx vitest run --coverage   # coverage report (91%+ stmts on the intel core)
npm run build && npm start  # production build
```

## What's implemented (PRD module map)

| PRD module | Feature | Where |
|---|---|---|
| **A1** Natural-language querying | **Claude API** (`claude-haiku-4-5`, structured outputs) translates free-form questions into validated query filters; deterministic rule-engine parser as automatic offline fallback | `src/lib/intel/llm.ts`, `queryParser.ts`, `/copilot` |
| **A2** Context retention | Follow-ups like *"Only solved cases"* merge into the previous filter (both engines) | `llmCoerce.ts` / `isRefinement` logic |
| **A3** Kannada support | Ask in ಕನ್ನಡ, get answers in ಕನ್ನಡ grounded in real database results (English fields like FIR numbers preserved) | `llm.ts` language detection + compose |
| **A4** Voice interface | Speak questions (English/Kannada) via the browser SpeechRecognition API; answers read back with speech synthesis | `src/components/copilot/useVoice.ts` |
| **A5** Conversation export | CSV and PDF export with queries, answers, confidence, evidence refs, timestamps | `/copilot` → Export CSV / PDF |
| **B1/B3** Network graph + entity explorer | 2–3-hop BFS across persons, FIRs, phones, vehicles, bank accounts; custom SVG force layout | `src/lib/intel/network.ts`, `/network` |
| **B2** Organized crime detection | Union-find clustering of repeat co-accused → crime rings (recovers all 5 seeded gangs) | `src/lib/intel/gangs.ts` |
| **C1/C2** Temporal + geographic analytics | Monthly trend, hour-of-day, district and crime-type breakdowns | `/analytics` |
| **C3** Hotspot detection | Intensity ranking + emerging-cluster flags (quarter-over-quarter growth) | `src/lib/intel/hotspots.ts` |
| **C4** MO serial patterns | FIRs sharing an identical modus operandi clustered as potential serial offenders; banner on case detail | `src/lib/intel/moClusters.ts`, `/analytics` |
| **D** Sociological intelligence | District crime rates correlated (Pearson) with 2011 Census literacy & urbanisation; explainable social-risk score | `src/lib/intel/sociology.ts`, `/sociology` |
| **E1–E3** Offender profiling + risk scoring | Repeat-offender register; explainable weighted score (priors, network degree, recency, versatility) → Low/Medium/High | `src/lib/intel/riskScoring.ts`, `/offenders` |
| **F1–F4** Investigator decision support | Auto case summary, timeline, similar-case retrieval (MO/type/location), suggested leads incl. financial referrals | `src/lib/intel/caseIntel.ts`, `/cases/[id]` |
| **G1–G3** Financial intelligence | Money-trail graph visualization, circular-transfer (layering) ring detection, high-value transaction leads on case pages + dedicated Financial page | `src/lib/intel/financial.ts`, `/financial`, `caseIntel.ts` |
| **H1–H3** Forecasting + early warning | Least-squares 3-month forecast; emerging-hotspot alerts on the overview | `src/lib/intel/forecast.ts`, `/`, `/analytics` |
| **I1–I3** Explainable AI | Every answer carries evidence (FIR numbers), a reasoning trail, and a confidence score | `/copilot` response cards |
| **J1** RBAC-lite | Role switcher (Investigator/Analyst/Supervisor/Administrator); role tags every audit row | top bar |
| **J2** Audit logging | Every query, view, and export logged | `src/lib/audit.ts`, `/audit` |

To enable the Claude-powered Copilot, put `ANTHROPIC_API_KEY=sk-ant-...` in `.env.local` (gitignored). Without a key the Copilot transparently uses the offline rule engine — every response is badged with the engine that produced it.

Not yet built (honest gaps): Hindi/Tamil/Telugu (A3 lists them as future languages — Kannada is fully supported), and hardened production auth (JWT/SSO — the demo uses session-cookie RBAC-lite).

## Architecture

```
src/
├── app/                # Next.js App Router
│   ├── api/            # chat, analytics, network, offenders, cases, overview, audit
│   └── (pages)         # /, /copilot, /network, /analytics, /offenders, /cases, /audit
├── components/         # UI: sidebar, charts (Recharts), SVG network graph, copilot cards
└── lib/
    ├── db/             # better-sqlite3 client, schema, deterministic seeder
    ├── intel/          # PURE intelligence core — parser, executor, risk, hotspots,
    │                   # forecast, gangs, network, case intel (95%+ test coverage)
    └── audit.ts        # J2 audit logging
```

Design notes:

- **Intelligence core is pure and DB-agnostic where possible** — parser, risk scorer, hotspot detector, forecaster, and ring detector take plain data in and return plain data out, so they're unit-tested without any database.
- **Seeded RNG** (`mulberry32`) makes the demo dataset identical on every machine.
- **API envelope** is uniform: `{ success, data, error }`; failures log server-side and return generic messages.
- Chart palette follows a CVD-validated dark-mode palette (all contrast/colorblind checks pass).

## Demo script

The full 2-minute walkthrough (landing → login → Copilot in English, Kannada and voice → network rings → financial intel → live workspace → audit) lives in [`docs/demo-script.md`](docs/demo-script.md). The system architecture and Copilot data flow are documented in [`docs/architecture.md`](docs/architecture.md).
