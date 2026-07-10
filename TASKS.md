# DRISHTI v2 — Task Board (until July 26 submission)

**Workflow:** each person works ONLY on their own branch. When a task is done:
`npx vitest run && npm run build` must pass → push → open a Pull Request to `main` → Pranav reviews and merges. After any merge to `main`, BOTH people run `git merge origin/main` on their branch.

**What changed July 9 (v2 plan approved):** the judge sessions + official ER diagram changed the bar. New scope: official KSP schema alignment, an agentic investigation mode, a geographic crime-density map, wider Copilot reach, deployment on **Zoho Catalyst AppSail** (deployment ONLY — stack stays Next.js + SQLite + Claude/rules). Full plan: see `docs/` after A-track lands docs, or ask Pranav.

---

## Track A — `feat/v2-core` (Pranav)

### A0 · Catalyst account + TASKS rewrite (July 9) ✅ board rewritten; signup in progress
Zoho Catalyst signup, project creation, `zcatalyst-cli` login. Blocking for A1.

### A1 · AppSail deploy spike (July 10–11)
Hello-world Next 16 standalone deploy. Resolve: listen-port env var, upload limits, **linux better-sqlite3 binary** (build artifacts on a GitHub Action, ubuntu-latest). `next.config.ts` → `output: 'standalone'`.
- Accept: any Next 16 page served from an AppSail URL; documented build recipe in `docs/deployment.md`.

### A2 · Schema v2 — official ER alignment (July 10–12)
Additive `PRAGMA user_version` migrations: official lookup tables (districts, units + hierarchy, ranks, employees, courts, case categories, gravity, crime heads, acts/sections), per-case tables (`accused`, `case_victims`, `complainants`, `arrest_surrender`, `chargesheet_details`, `act_section_association`) each carrying `resolved_person_id` → our global `persons` layer; official columns on `firs` (18-digit `crime_no` etc.); official PascalCase SQL views (`CaseMaster`, `Accused`, …). Seeder v2 on a **second RNG stream** (`SEED + 1`) so v1 rows stay byte-identical.
- Accept: existing 108 tests pass **unedited**; `SELECT * FROM CaseMaster` column names match the official ER PDF; new `tests/schemaV2.test.ts` green; `docs/schema-mapping.md` written.

### A3 · Copilot NL expansion (July 13–14)
New intents in BOTH engines (LLM ParseSchema + deterministic parser): `personProfile`, `caseDetail`, `networkQuery`, `financialSummary`, `actSection`, `hotspotQuery`, `investigate`. Name resolution with candidate lists.
- Accept: each intent answers correctly with and without `ANTHROPIC_API_KEY`; parity tests green.

### A4 · Investigation agent (July 14–15)
`src/lib/intel/agent.ts`: "Investigate <name>" autonomously chains resolve → priors → network → risk → similar cases → financial → geography → lead memo, with a step-by-step trace card (evidence FIR numbers per step). One Claude call max; deterministic memo fallback.
- Accept: "Investigate <seeded gang member>" produces an 8-step trace + memo in `/copilot`; `tests/agent.test.ts` green.

### A5 · Crime-density map + forecast overlay (July 16–17)
Leaflet map page: incident-density layer (lat/lon already seeded), emerging-hotspot layer, per-district 3-month forecast overlay. Offline fallback = Karnataka SVG outline.
- Accept: `/map` renders all three layers; crime-type filter works; ಕನ್ನಡ toggle translates the page (keys from B-track).

### A6 · Knowledge-base answers, RAG-lite (July 18–19, HARD cut-line July 19 EOD)
SQLite FTS5 over real act/section text (corpus from B2): "what section applies to chain snatching?" → grounded answer with citations, badged "Knowledge base answer". Keyless fallback = extractive snippets.
- Accept: legal questions answered with correct section citations; if not merged by July 19, ship retrieval-only or drop.

### A7 · RBAC on real rank/unit hierarchy (July 19–20)
Demo logins become PSI / PI (SCRB) / SP / DGP with unit + jurisdiction; Copilot and case list auto-scope to jurisdiction with a visible "Scoped to your jurisdiction" reasoning line.
- Accept: investigator sees Bengaluru City-scoped answers; DGP sees statewide; `tests/scope.test.ts` green.

### A8 · Full deploy + hardening + UI pass (July 20–21)
Production deploy to AppSail; LLM timeouts 8s/no-retry (30s platform cap); `AUTH_SECRET` required in prod; C4 page-level UI polish; live-workspace "resets on redeploy" banner.
- Accept: end-to-end smoke on the deployed URL (login → Copilot → agent → map → audit); demo reseeds after forced restart.

---

## Track B — `feat/frontend-track` (Varun)

> Golden rule unchanged: copy an existing working pattern, change the words. Never touch files under `src/lib/` except `src/lib/i18n.tsx`. If a change feels like it needs logic, stop and flag it.

### B1 · Legal knowledge-base curation (July 9–13) — the big one, pure data entry, high judge value
Create `docs/kb/sections.csv` with columns: `act_code, act_name, section_code, section_title, section_text, source_url`. Fill ~50 rows covering the 10 crime types:
- **BNS 2023** (Bharatiya Nyaya Sanhita) sections for: theft (§303), snatching (§304), burglary/house-trespass (§329–334), murder (§101–103), assault/hurt (§115–125), extortion (§308), cheating/fraud (§318), organised crime (§111).
- **IT Act 2000**: §66 (computer offences), §66C (identity theft), §66D (cheating by personation), §67.
- **NDPS Act 1985**: §8, §20–22, §29. **Arms Act 1959**: §3, §25. **Motor Vehicles / vehicle theft** related BNS sections.
- `section_text` = the actual official wording (India Code https://www.indiacode.nic.in is the source; paste the operative text, not summaries). One row per section.
- Accept: ≥50 rows, every crime type covered by ≥2 sections, source URL on every row. Pranav converts to `lookups.ts` — you never touch code for this.

### B2 · i18n keys for new surfaces (July 14–17, after A3/A4/A5 merge)
Same recipe as before (add keys to BOTH `en` and `kn` in `i18n.tsx`, use `t('key')` in page files): map page, agent trace card labels, knowledge-base badge, rank/unit badges. Pranav gives you the key list per merged PR.
- Accept: no mixed-language chrome on any new page; `npm run build` passes.

### B3 · New Copilot suggestion chips (July 15, page file only)
Add example chips to `copilot/page.tsx` for the new powers: "Investigate Ravi Kumar", "Who is linked to …", "Cases under BNS 303", "ಕಳ್ಳತನ ಹಾಟ್‌ಸ್ಪಾಟ್ ತೋರಿಸಿ".
- Accept: chips fire the right intents (Pranav verifies parse), both languages.

### B4 · Screenshot pass (July 17–19, AFTER A8 UI pass merges)
Full-window shots of every page — en + kn, incl. map, agent trace, KB answers, rank badges. Save under `docs/screenshots/`, clear names.

### B5 · Demo script v2 + QA runs (July 19–21)
Update `docs/demo-script.md` with the new beats (agent investigation, density map, KB answer, jurisdiction scoping). Execute `docs/qa-checklist.md` on local build; file GitHub Issues with screenshots; do NOT fix code.

### B6 · Deployed-URL QA + rehearsal support (July 22–25)
Re-run the QA checklist against the deployed AppSail URL. Time both demo rehearsals; capture video B-roll.

---

## Track C — shared (July 22–26, after freeze)

### C1 · Judge-facing docs (Pranav, drafts earlier)
README v2 rewrite (official-schema section, deployed URL, rank table), `docs/architecture.md` (agent/map/KB flows), **new `docs/scalability.md`** (the 1–2 lakh-case design narrative), `docs/schema-mapping.md`.

### C2 · Submission package (both, July 22–25)
Backup demo video (en + kn), 2 timed rehearsals, fresh-clone 3-step run test, tag release, **rotate the Anthropic API key after the demo**.

---

## Explicitly cut (don't spend time on these)
Catalyst Data Store / QuickML / Circuits / Zia face-match / OCR / push notifications / Hindi. Rationale for judges: we aligned to the official KSP FIR schema and kept a fully explainable, auditable stack — every AI answer carries evidence FIR numbers and a deterministic offline fallback; Catalyst hosts the deployment; the agentic investigation is an application-level orchestrator over our own traceable intel modules.

## Shared rules
- Small commits, one task per PR, PR title = task ID (e.g. `A2: schema v2`).
- Never commit `.env.local` or anything in `data/`.
- Feature freeze **July 22**. After that: only fixes for issues found in QA.
