# DRISHTI — Task Board (until July 26 submission)

**Workflow:** each person works ONLY on their own branch. When a task is done:
`npx vitest run && npm run build` must pass → push → open a Pull Request to `main` → Pranav reviews and merges. After any merge to `main`, BOTH people run `git merge origin/main` on their branch.

---

## Track A — `feat/intel-track` (experienced)

### A1 · Real-data correctness pass (July 7)
The analytics/overview "recent quarter" windows are hard-coded to the synthetic 2026 calendar, and offender recency is measured against the demo dataset's end date. Make them relative to the data in the active workspace (use `MAX(occurred_at)` as "now").
- Files: `src/app/api/analytics/route.ts`, `src/app/api/overview/route.ts`, `src/lib/intel/offenders.ts`
- Accept: demo results unchanged (±rounding); a live-workspace case entered today counts as "recent"; tests updated.

### A2 · Module D — Sociological intelligence (July 8–9)
New module: correlate district crime rates with public Census indicators (literacy %, urbanization %) and compute a social-risk indicator per district.
- New: `src/lib/data/census.ts` (static 2011 Census figures per district, sourced + commented), `src/lib/intel/sociology.ts` (pure correlation/risk functions + tests), `src/app/api/sociology/route.ts`, `src/app/(app)/sociology/page.tsx`, sidebar entry.
- Accept: page renders both workspaces; Pearson correlation shown with an honest "correlation ≠ causation" note; ≥6 unit tests.

### A3 · C4 — Modus operandi clustering (July 10)
Group FIRs sharing the same MO; surface "serial pattern" chips.
- New: `src/lib/intel/moClusters.ts` (+tests), extend `/api/analytics` or new route, section on Analytics page, "Part of a series of N cases" banner on case detail.
- Accept: demo data shows the seeded MO patterns; single-case MOs are not flagged.

### A4 · Architecture diagram + evaluator README (July 11–13)
- `docs/architecture.md` with a mermaid diagram (browser → Next.js routes → intel core → SQLite workspaces → Claude API), data-flow of one Copilot query.
- Rewrite README top section for judges: what it is, 3-step run guide, demo accounts table, module map.

---

## Track B — `feat/frontend-track` (easier, guided)

> Golden rule for this track: copy an existing working pattern, change the words. Never touch files under `src/lib/` except `src/lib/i18n.tsx`. If a change feels like it needs logic, stop and flag it instead.

### B1 · Kannada dictionary for inner pages (July 7–8) — the big one, but mechanical
Goal: the ಕನ್ನಡ toggle translates every inner page, not just Overview.
Step by step, one page at a time (do Copilot first, then Analytics, Network, Financial, Offenders, Cases, Audit):
1. Open the page file, e.g. `src/app/(app)/analytics/page.tsx`.
2. Find each English UI string (titles, subtitles, table headers, buttons). Data values (names, FIR numbers, districts) stay English.
3. Add a key for each to BOTH `en` and `kn` objects in `src/lib/i18n.tsx` (follow the existing `overview.*` keys as the pattern — the file shows exactly how).
4. In the page: add `import { useLanguage } from '@/lib/i18n';`, add `const { t } = useLanguage();` inside the component, replace the string with `{t('your.key')}`.
5. Toggle the language in the browser and check the page reads correctly in both.
- Accept: no page shows mixed English chrome when toggled to ಕನ್ನಡ; `npm run build` passes.
- Reference for correct Kannada wording: the Overview page keys + ask Pranav when unsure.

### B2 · Translate Track A's new pages (July 9–10, after A2/A3 are merged)
Same recipe as B1 for the new Sociology page and MO cluster section.

### B3 · Screenshot pass (July 11)
Full-window screenshots of every page — English and Kannada, plus login as each of the 4 roles for the pages that differ. Save under `docs/screenshots/` with clear names (`overview-en.png`, `overview-kn.png`, …). Commit them on the branch.

### B4 · Demo script draft (July 12)
`docs/demo-script.md`: a 2-minute walkthrough — landing → login (Investigator) → Copilot English question → Kannada question → voice → Network ring → Financial ring → switch to Live → register a case → show Copilot answering from it → Audit as Supervisor. Write the exact sentences to say.

### B5 · QA checklist runs (July 14+)
Execute `docs/qa-checklist.md` (Track A will create it): every role, every page, Chrome. File issues as GitHub Issues with screenshots; do NOT fix code — report.

---

## Shared rules
- Small commits, one task per PR, PR title = task ID (e.g. `A2: sociological module`).
- Never commit `.env.local` or anything in `data/`.
- Feature freeze **July 22**. After that: only fixes for issues found in QA.
