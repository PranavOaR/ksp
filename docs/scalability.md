# Scalability & Latency Design — DRISHTI at 1–2 Lakh Cases

The demo dataset is deliberately small (480 FIRs) so the walkthrough is reproducible, but the
architecture is designed and reasoned for the volume the organizers referenced: **one to two lakh
(100k–200k) cases statewide**. This document is the explicit latency/scale story.

## Why SQLite is the right engine at this scale

- 2 lakh FIR rows with all per-case satellites (~1M rows total) is a **small** SQLite database
  (~500 MB); SQLite serves read-heavy analytical workloads comfortably into the tens of millions
  of rows.
- Real statewide FIR volume is roughly **2–3k registrations/day** — trivially inside WAL-mode
  SQLite's single-writer envelope (thousands of writes/second).
- Every intelligence query DRISHTI runs is indexed:

| Query pattern | Index |
|---|---|
| District/status/date filters (Copilot, analytics) | `idx_firs_district_occurred (district, occurred_at)`, `idx_firs_type_occurred (crime_type, occurred_at)` |
| Person → cases (profiles, agent priors) | `idx_fir_accused_person`, `idx_case_accused_person` |
| Case → charged sections | `idx_asa_case` |
| CrimeNo lookups | unique partial index `idx_firs_crime_no` |
| Legal knowledge base | FTS5 inverted index (`kb_fts`) — bm25 lookup is O(query terms), independent of corpus growth |

## Bounded algorithms

The expensive intelligence operations are all explicitly bounded, so their cost does not grow
with total database size:

- **Network BFS** (`network.ts`): capped at `MAX_NODES = 120` and ≤3 hops — cost is per-ego-network,
  not per-database.
- **Investigation agent**: 7 SQLite steps are indexed lookups (O(log n)) + the bounded BFS; the
  whole playbook runs in <20ms on the demo set and stays sub-second at 2 lakh cases. The single
  LLM call dominates latency (~2–6s) regardless of data volume.
- **Query results**: every listing is LIMIT-ed (25 rows Copilot, 30/page case list, top-20
  offenders); counts run on covering indexes.
- **Ring detection / money trail**: canonical-form DFS with cycle length ≤ 6, deduplicated —
  at production scale this moves to the nightly recompute below.

## Latency strategy (near-real-time requirement)

- The deterministic path (rule engine + SQL) answers in **<50ms** end to end; the LLM path adds
  one parse call, capped at **8s timeout / zero retries** with automatic fallback to the rule
  engine — a slow LLM can only ever delay an answer, never break it. Worst case (agent with memo)
  stays under ~15s, inside the 30s platform request cap.
- **Rate limiting** (20 Copilot requests/min/user) protects both latency and the LLM budget under
  concurrent load; 100 concurrent users are bounded to ~33 LLM calls/second worst case, and the
  fallback engine absorbs any 429s transparently (the engine badge shows which path answered).
- At production scale, hot aggregates (monthly trend, district breakdowns, hotspot windows) become
  a **nightly/cron recompute into summary tables**; today they are live queries because 480 rows
  need no cache.

## What changes beyond ~10 lakh cases (production path)

Documented growth path, in order:

1. **Managed Postgres** replaces the SQLite files (the intel core is parameterized SQL — the
   queries port as-is; the pure functions don't change at all). This also removes the
   ephemeral-filesystem constraint of the demo hosting.
2. **Read replicas** for analytics/map endpoints; the write path (case registration, audit) stays
   on the primary.
3. Heavy jobs (statewide ring detection, forecast refresh, MO re-clustering) move to scheduled
   workers writing summary tables.
4. The FTS5 knowledge base moves to Postgres `tsvector` or stays as a sidecar SQLite — it is
   reference data, not case data.

## Demo-hosting constraint (stated plainly)

The hosted demo runs on Zoho Catalyst AppSail, whose filesystem is **ephemeral**: the demo
workspace reseeds deterministically on every boot (identical data, by design), and the live
workspace resets on redeploy — recover via the built-in CSV case import/export. Production
persistence is item 1 above.
