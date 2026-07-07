# DRISHTI QA Checklist (B5)

How to run this checklist, start to finish. Budget ~2.5 hours for one full pass.

## Setup (before every pass)

1. `git checkout main && git pull && npm run build && npm start` — test the **production** build, not dev mode.
2. Chrome, normal window ≥ 1280 px wide. Open DevTools → Console and keep it visible.
3. Log in as `admin` / `demo` → top bar → **Reset demo data** so the demo workspace is pristine.
4. Confirm `.env.local` has `ANTHROPIC_API_KEY` set (we test both with and without — see Copilot section).

## How to report

File one GitHub Issue per problem at https://github.com/PranavOaR/ksp/issues — **do not fix code**.

```
Title:    [QA] <page> — <one-line symptom>
Body:     Role: … · Language: … · Workspace: … · Steps: … · Expected: … · Got: …
Attach:   full-window screenshot
Label:    qa-b5, plus `demo-blocker` if it breaks the 2-minute demo path
```

## Global checks — apply on EVERY page you visit

- [ ] No red errors in the DevTools console.
- [ ] Toggle **ಕನ್ನಡ**: every heading, button, table header and label translates. Data values (names, FIR numbers, districts) stay English — that is correct behaviour.
- [ ] Toggle back to English: nothing stays stuck in Kannada.
- [ ] Reload the page directly by URL — it renders (no blank screen).
- [ ] Visit `/audit` as Supervisor afterwards: your page views appear as audit rows with the right role.

## Role access matrix

Log in as each account and confirm the sidebar + direct-URL behaviour matches this table exactly. "Blocked" = the amber "Access restricted" card, and the attempt is audit-logged.

| Page | inv (Investigator) | analyst | supervisor | admin |
|---|---|---|---|---|
| Overview `/overview` | ✅ | ✅ | ✅ | ✅ |
| Copilot `/copilot` | ✅ | ✅ | ✅ | ✅ |
| Network `/network` | ✅ | ✅ | ✅ | ✅ |
| Financial `/financial` | 🚫 blocked + hidden in sidebar | ✅ | ✅ | ✅ |
| Analytics `/analytics` | ✅ | ✅ | ✅ | ✅ |
| Offenders `/offenders` | ✅ | ✅ | ✅ | ✅ |
| Cases `/cases`, `/cases/[id]` | ✅ | ✅ | ✅ | ✅ |
| Sociology `/sociology` | ✅ | ✅ | ✅ | ✅ |
| Audit `/audit` | 🚫 | 🚫 | ✅ | ✅ |
| Case **status update** | 🚫 API rejects (403) | 🚫 | ✅ | ✅ |
| CSV import `/cases/import` | 🚫 API rejects (403) | 🚫 | ✅ | ✅ |
| Reset demo data | 🚫 | 🚫 | 🚫 | ✅ |

Also test each 🚫 by **direct URL** (e.g. visit `/audit` as `inv`), not just sidebar absence.

## Per-page checks (demo workspace, English, as `inv` unless stated)

### Landing `/` + `/platform` `/security` `/modules`
- [ ] Hero renders, Karnataka dot-field animates, no layout jumps.
- [ ] All CTAs route correctly; login link works.

### Login `/login`
- [ ] Wrong password → friendly error, no crash, nothing leaks in console.
- [ ] Each of the 4 demo accounts logs in and lands on Overview.
- [ ] Logout returns to landing; the back button does not re-enter the app shell.

### Overview `/overview`
- [ ] KPIs populated (480 FIRs seeded); emerging-hotspot alerts show.
- [ ] Recent FIR list links to case detail.

### Copilot `/copilot` — flagship, test hardest
- [ ] English: *"Show theft cases in Mysuru"* → results + evidence FIR refs + confidence + engine badge.
- [ ] Refinement: *"Only solved cases"* narrows the previous filter (context retention).
- [ ] Kannada: *"ಮೈಸೂರಿನಲ್ಲಿ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳು"* → Kannada answer, FIR numbers in Latin script.
- [ ] Voice: mic button dictates a question; answer is read aloud.
- [ ] Export CSV and Export PDF both download and open.
- [ ] Reasoning trail expands on every answer.
- [ ] **Offline fallback:** stop the server, remove `ANTHROPIC_API_KEY` from `.env.local`, restart → same questions answered by rule engine, badge changes, no error screen. Put the key back afterwards.
- [ ] Nonsense input (*"asdf qwerty"*) → graceful "didn't understand" answer, not a crash.

### Network `/network`
- [ ] All 5 seeded crime rings listed; clicking a member draws the 2-hop graph; 3-hop toggle works; graph doesn't freeze the tab.

### Financial `/financial` (as `analyst`)
- [ ] Transaction rings render; high-value leads link to cases.

### Analytics `/analytics`
- [ ] Trend chart shows dashed 3-month forecast; hour-of-day, district, crime-type, status breakdowns all populated.
- [ ] MO serial patterns card lists seeded patterns, each with ≥ 2 cases (never 1).

### Offenders `/offenders`
- [ ] Risk filter works; score bars show the explainable breakdown; Low/Medium/High categories all present.

### Cases `/cases`, `/cases/[id]`, `/cases/new`
- [ ] List filters and pagination work; detail page shows summary, timeline, similar cases, leads.
- [ ] A case belonging to an MO cluster shows the amber "Part of a series of N cases" banner; a unique-MO case shows none.
- [ ] As `supervisor`: advance a case Open → Under Investigation → Solved; status persists after reload and is audit-logged.

### Sociology `/sociology`
- [ ] Both Pearson correlation cards render with sign and 3 decimals; "correlation ≠ causation" note visible; 10 district rows, risk-sorted.

### Audit `/audit` (as `supervisor`)
- [ ] Every action from this QA session appears, newest first, with role attribution — including blocked access attempts.

## Live workspace pass (the demo's riskiest flow)

1. Top bar → switch **Demo → Live** (page reloads).
2. Empty states: every page must render sensibly with zero/own data — no crashes, no NaN, no "undefined".
3. `/cases/new`: register a case dated **today**.
4. Copilot: ask about it (*"cases in <district> this week"*) — the new case must appear.
5. Overview: the new case counts as **recent** (A1 fix).
6. As `supervisor`, `/cases/import`: import a small CSV → rows appear; as `inv`, confirm the API refuses (403).
7. Switch back to Demo: seeded data intact, unchanged by anything you did in Live.

## Known issues — do not re-file

- The case-status dropdown is still *visible* to Investigator/Analyst (the API rejects the change with a clear 403 error). Hiding the control for those roles is scheduled in Track C4 to avoid conflicting with the B1 translation work in that page file.

## Sign-off

One full pass per role minimum: `inv` (full), `analyst` (Financial + spot checks), `supervisor` (Audit, status updates, import), `admin` (reset). Date and initial each pass at the bottom of this file in your PR.

| Date | Role(s) | Pass/Issues filed | Initials |
|---|---|---|---|
