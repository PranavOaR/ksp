# DRISHTI QA Execution Report (B5)

**Executed by:** Antigravity AI (static analysis + production build)  
**Date:** 2026-07-08  
**Build:** `npm run build` — ✅ compiled successfully, 33 pages, 0 TypeScript errors  
**Unit tests:** `npx vitest run` — ✅ 108/108 passed  

---

## ⚠️ Scope & Honesty Note

This report distinguishes two verification levels:

| Symbol | Meaning |
|--------|---------|
| ✅ **STATIC** | Verified by reading source code (route guards, seed constants, API middleware) — provably correct without a browser |
| 🔲 **NEEDS BROWSER** | Cannot be verified without a human running Chrome — **do not mark passed until done in browser** |
| ❌ **BUG FOUND** | An issue discovered during static analysis, filed as a GitHub Issue template below |

A human reviewer must open Chrome, run `npm start` on the production build, and complete every 🔲 item before sign-off.

---

## Setup verification

| Check | Status | Evidence |
|-------|--------|---------|
| Production build compiles with 0 errors | ✅ **STATIC** | `npm run build` output above |
| All 15 unit test files pass (108 tests) | ✅ **STATIC** | vitest output |
| FIR_COUNT = 480 in seed | ✅ **STATIC** | `src/lib/db/seed.ts` line 13: `const FIR_COUNT = 480` |
| `ANTHROPIC_API_KEY` in `.env.local` | 🔲 **NEEDS BROWSER** | Can only be confirmed at runtime |
| Demo data reset available to admin | ✅ **STATIC** | `POST /api/admin/reset-demo` — admin-only at API level |

---

## Global checks (apply on every page)

| Check | Status | Notes |
|-------|--------|-------|
| No red errors in DevTools console | 🔲 **NEEDS BROWSER** | Must be confirmed per page per role |
| Kannada toggle — headings/buttons translate | 🔲 **NEEDS BROWSER** | i18n keys are wired (B1/B2 confirmed in source), visual confirmation needed |
| Toggle back to English — nothing stuck | 🔲 **NEEDS BROWSER** | |
| Direct URL reload — no blank screen | 🔲 **NEEDS BROWSER** | All pages are server-rendered (ƒ) so should hydrate correctly |
| Audit shows page views after visiting each page | 🔲 **NEEDS BROWSER** | audit log calls verified in source for: view_case, view_analytics, view_overview; spot-check others |

---

## Role access matrix

Verified from `src/lib/authShared.ts` (ROLE_ACCESS) and per-page `RoleGate` components:

| Page | investigator | analyst | supervisor | admin | Source |
|------|-------------|---------|-----------|-------|--------|
| `/overview` | ✅ **STATIC** | ✅ | ✅ | ✅ | No restriction in ROLE_ACCESS |
| `/copilot` | ✅ **STATIC** | ✅ | ✅ | ✅ | No restriction |
| `/network` | ✅ **STATIC** | ✅ | ✅ | ✅ | No restriction |
| `/financial` — sidebar hidden | ✅ **STATIC** | ✅ | ✅ | ✅ | `ROLE_ACCESS['/financial'] = ['Analyst','Supervisor','Administrator']`; Sidebar filters via `canAccess()` |
| `/financial` — RoleGate blocks | ✅ **STATIC** | ✅ | ✅ | ✅ | `RoleGate allow={['Analyst','Supervisor','Administrator']}` in financial/page.tsx |
| `/analytics` | ✅ **STATIC** | ✅ | ✅ | ✅ | No restriction |
| `/offenders` | ✅ **STATIC** | ✅ | ✅ | ✅ | No restriction |
| `/cases`, `/cases/[id]` | ✅ **STATIC** | ✅ | ✅ | ✅ | No restriction |
| `/sociology` | ✅ **STATIC** | ✅ | ✅ | ✅ | No restriction |
| `/audit` — blocked for inv/analyst | ✅ **STATIC** | ✅ blocked | ✅ | ✅ | `ROLE_ACCESS['/audit'] = ['Supervisor','Administrator']`; RoleGate in audit/page.tsx |
| Case status update (PATCH) | ✅ **STATIC** | 🔲 verify 403 in browser | ✅ | ✅ | API line 16-17: `session.role !== 'Supervisor' && session.role !== 'Administrator'` → 403 |
| `/cases/import` API | ✅ **STATIC** | 🔲 verify 403 | ✅ | ✅ | `src/app/api/import/route.ts` line 19: 403 for non-Supervisor/Admin |
| Reset demo data | 🔲 | 🔲 | 🔲 blocked | ✅ | `reset-demo/route.ts`: Administrator-only at API level; reset button only rendered for Administrator in overview/page.tsx |

### ⚠️ Known issue (do not re-file per checklist)
The case-status dropdown **is visible** to Investigator/Analyst in the UI (the API correctly rejects with 403). This is documented in the checklist as Track C4 scheduled work.

---

## Per-page checks

### Landing `/` + `/platform` `/security` `/modules`

| Check | Status |
|-------|--------|
| Hero renders, dot-field animates | 🔲 **NEEDS BROWSER** |
| All CTAs route correctly; login link works | 🔲 **NEEDS BROWSER** |

### Login `/login`

| Check | Status |
|-------|--------|
| Wrong password → friendly error, no crash | 🔲 **NEEDS BROWSER** |
| All 4 demo accounts log in and land on Overview | 🔲 **NEEDS BROWSER** (credentials confirmed in source: `investigator`, `analyst`, `supervisor`, `admin` / `drishti123`) |
| Logout returns to landing; back button doesn't re-enter app | 🔲 **NEEDS BROWSER** |

### Overview `/overview`

| Check | Status |
|-------|--------|
| KPIs populated with 480 FIRs | ✅ **STATIC** (seed count = 480) + 🔲 visual confirm |
| Emerging hotspot alerts show | 🔲 **NEEDS BROWSER** |
| Recent FIR list links to case detail | 🔲 **NEEDS BROWSER** |

### Copilot `/copilot` — flagship

| Check | Status |
|-------|--------|
| English: *"Show theft cases in Mysuru"* → results + evidence FIR refs | 🔲 **NEEDS BROWSER** |
| Refinement: *"Only solved cases"* narrows previous filter | 🔲 **NEEDS BROWSER** |
| Kannada: *"ಮೈಸೂರಿನಲ್ಲಿ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳು"* → Kannada answer | 🔲 **NEEDS BROWSER** |
| Voice: mic button dictates; answer read aloud | 🔲 **NEEDS BROWSER** (requires microphone) |
| Export CSV downloads and opens | 🔲 **NEEDS BROWSER** |
| Export PDF downloads and opens | 🔲 **NEEDS BROWSER** |
| Reasoning trail expands on every answer | 🔲 **NEEDS BROWSER** |
| Offline fallback: rule engine, badge changes, no error | 🔲 **NEEDS BROWSER** |
| Nonsense input → graceful "didn't understand" | 🔲 **NEEDS BROWSER** |

### Network `/network`

| Check | Status |
|-------|--------|
| 5 seeded crime rings listed | ✅ **STATIC** (seed.ts seeds 5 gangs) + 🔲 visual confirm |
| Clicking a member draws 2-hop graph | 🔲 **NEEDS BROWSER** |
| 3-hop toggle works; graph doesn't freeze tab | 🔲 **NEEDS BROWSER** |

### Financial `/financial` (as `analyst`)

| Check | Status |
|-------|--------|
| Transaction rings render | 🔲 **NEEDS BROWSER** |
| High-value leads link to cases | 🔲 **NEEDS BROWSER** |

### Analytics `/analytics`

| Check | Status |
|-------|--------|
| Trend chart shows dashed 3-month forecast | 🔲 **NEEDS BROWSER** |
| Hour-of-day, district, crime-type, status breakdowns populated | 🔲 **NEEDS BROWSER** |
| MO serial patterns card lists seeded patterns, each ≥ 2 cases | ✅ **STATIC** (moClusters unit test verifies cluster logic) + 🔲 visual confirm |

### Offenders `/offenders`

| Check | Status |
|-------|--------|
| Risk filter works | 🔲 **NEEDS BROWSER** |
| Score bars show explainable breakdown | 🔲 **NEEDS BROWSER** |
| Low/Medium/High categories all present | 🔲 **NEEDS BROWSER** |

### Cases `/cases`, `/cases/[id]`, `/cases/new`

| Check | Status |
|-------|--------|
| List filters and pagination work | 🔲 **NEEDS BROWSER** |
| Detail page shows summary, timeline, similar cases, leads | 🔲 **NEEDS BROWSER** |
| MO cluster case shows amber serial banner | ✅ **STATIC** (source: `moSerialPattern.isSerial` drives the amber banner) + 🔲 confirm which cases trigger it |
| Unique-MO case shows no banner | 🔲 **NEEDS BROWSER** |
| As supervisor: advance Open → Under Investigation → Solved; persists + audit-logged | 🔲 **NEEDS BROWSER** |

### Sociology `/sociology`

| Check | Status |
|-------|--------|
| Both Pearson correlation cards render with sign and 3 decimals | ✅ **STATIC** (r.toFixed(3) and sign in source) + 🔲 visual confirm |
| "correlation ≠ causation" note visible | ✅ **STATIC** (key `sociology.caveat.prefix` rendered unconditionally) + 🔲 visual confirm |
| 10 district rows, risk-sorted | 🔲 **NEEDS BROWSER** |

### Audit `/audit` (as supervisor)

| Check | Status |
|-------|--------|
| Every action from QA session appears, newest first, with role attribution | 🔲 **NEEDS BROWSER** |
| Blocked access attempts logged | 🔲 **NEEDS BROWSER** |

---

## Live workspace pass

| Check | Status |
|-------|--------|
| Demo → Live switch causes page reload | ✅ **STATIC** (`window.location.reload()` in WorkspaceSwitch.tsx) + 🔲 visual confirm |
| Empty states — no crashes, no NaN, no "undefined" | 🔲 **NEEDS BROWSER** |
| `/cases/new` registers a case dated today | 🔲 **NEEDS BROWSER** |
| Copilot finds the new case immediately | 🔲 **NEEDS BROWSER** |
| Overview counts new case as recent | 🔲 **NEEDS BROWSER** |
| Supervisor CSV import: rows appear; investigator gets 403 | 🔲 **NEEDS BROWSER** |
| Switch back to Demo: seeded data intact | 🔲 **NEEDS BROWSER** |

---

## Static analysis findings (potential issues)

### FINDING 1 — Audit sidebar not hidden from Investigator/Analyst

**Severity:** Medium — UX / policy  
**Evidence from source:**  
- `ROLE_ACCESS['/audit'] = ['Supervisor', 'Administrator']` — sidebar correctly hides it via `canAccess()`  
- **However**, `RoleGate` renders "Access restricted" but the checklist says blocked attempts should be audit-logged — RoleGate only shows a card, it does not call `logAudit`. The API `/api/audit` may or may not log the attempt.  
- **Action needed:** Verify in browser whether visiting `/audit` as Investigator creates an audit row. If not, that's a gap vs. the checklist requirement.  

### FINDING 2 — `copilot.listeningKn` key in kn object returns English string

**Severity:** Low — i18n  
**Evidence from source:**  
In B1, the key `'copilot.listeningKn'` in the `kn` object was set to `'ಕೇಳಿಸಿಕೊಳ್ಳಲಾಗುತ್ತಿದೆ…'` — the Kannada form. However `'copilot.listening'` in `kn` returns `'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದೆ…'`. The copilot page picks between these two based on `isKannada`. Verify in browser that the correct string appears when the language mode is Kannada.

### FINDING 3 — Financial page title in Kannada says "ಹಣಕಾಸು ಅಪರಾಧ ಗುಪ್ತಚರ ವಿಶ್ಲೇಷಣೆ" (long)

**Severity:** Low — i18n/layout  
**Action:** Confirm the title doesn't overflow the PageHeader on smaller viewports.

---

## GitHub Issue templates (ready to file for browser-found issues)

Copy one template per issue found during browser QA to https://github.com/PranavOaR/ksp/issues:

```
Title:    [QA] <page> — <one-line symptom>

Role: <investigator | analyst | supervisor | admin>
Language: <English | Kannada>
Workspace: <Demo | Live>
Browser: Chrome <version>
Steps:
  1. Log in as <username> / drishti123
  2. Navigate to <URL>
  3. <What you did>
Expected: <What should happen>
Got: <What actually happened>
Screenshot: [attach full-window screenshot]
Labels: qa-b5 [, demo-blocker if it breaks the 2-minute demo path]
```

---

## Sign-off table

| Date | Role(s) covered | Items verified in browser | Issues filed | Initials |
|------|----------------|--------------------------|-------------|---------|
| 2026-07-08 | all (static analysis) | 0 (no browser session) | 0 filed (templates above) | AI |
| | investigator (full) | | | |
| | analyst (Financial + spots) | | | |
| | supervisor (Audit, status, import) | | | |
| | admin (reset) | | | |

---

## How to run the browser pass

```bash
# 1. Build production bundle (already passing)
npm run build

# 2. Start production server
npm start
# → http://localhost:3000

# 3. Open Chrome ≥ 1280 px wide, DevTools → Console visible

# 4. Log in as admin, reset demo data (Overview → ↺ Reset demo data)

# 5. Work through every 🔲 item in this checklist for each role
#    File a GitHub Issue per failure with the template above
```
