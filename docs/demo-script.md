# DRISHTI — 2-Minute Demo Script

**Total runtime:** ~2 minutes at a natural speaking pace  
**Audience:** Karnataka State Police leadership, demo reviewers  
**Presenter setup:** Chrome at ≥ 1280 px, Demo workspace, demo data reset via admin account  
**Microphone:** Enabled in Chrome for the voice-input step  

---

## Step 1 — Landing page `[0:00–0:15]`

**Say aloud:**
> "This is DRISHTI — the intelligence platform built for Karnataka State Police.
> From a single screen, investigators can interrogate the entire FIR database in plain
> English or Kannada, map criminal networks, trace money, and forecast where crime is
> heading next. Let me show you the full picture in two minutes."

**Action:** Open `https://localhost:3000` (or your deployed URL). The animated Karnataka dot-field fills the hero.  
**Audience sees:** The DRISHTI landing hero — the dot-field animation and the headline *"Stop investigating in the dark."*

---

## Step 2 — Login as Investigator `[0:15–0:25]`

**Say aloud:**
> "I'll sign in as Inspector Ravi Kumar — an Investigator. Every access is role-gated
> and automatically logged in the audit trail."

**Action:** Click **Sign In**. Enter username `investigator`, password `drishti123`, click **Sign in →**.  
**Audience sees:** The Overview dashboard loads — five KPI tiles count up to 480 FIRs, solved rate, repeat offenders, high-risk profiles, and detected crime rings.

---

## Step 3 — Copilot: English question `[0:25–0:45]`

**Say aloud:**
> "As an Investigator, my fastest tool is the AI Copilot. I'll ask it a real question."

**Action:** Click **Copilot** in the sidebar.

**Say aloud (type or click the suggestion):**
> *"Show theft cases in Mysuru"*

**Action:** Type `Show theft cases in Mysuru` in the input box and press **Ask** (or hit Enter).  
**Audience sees:** The answer appears in seconds — a plain-English summary, a result table of matching FIR numbers with district, status and date, a blue confidence bar, and the AI engine badge (Claude AI or Rule engine). Click **Show reasoning trail** to expand the step-by-step chain of thought.

**Say aloud:**
> "Notice the evidence — real FIR numbers, each one a direct reference to the database.
> Now I'll narrow it down — follow-up questions keep the context."

**Action:** Type `Only solved cases` and press **Ask**.  
**Audience sees:** The result list narrows to solved theft cases in Mysuru only — context retained from the previous turn.

---

## Step 4 — Copilot: Kannada question `[0:45–0:55]`

**Say aloud:**
> "DRISHTI speaks Kannada natively. Watch this."

**Action:** Click the **EN** pill in the input bar to switch the answer language to **ಕನ್ನಡ**.

**Say aloud (type exactly as shown):**
> *"ಮೈಸೂರಿನಲ್ಲಿ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳು"*

**Action:** Copy–paste `ಮೈಸೂರಿನಲ್ಲಿ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳು` into the input and press **ಕೇಳಿ**.  
**Audience sees:** The AI responds entirely in Kannada — the answer paragraph, the FIR numbers (still in Latin script, as they are database identifiers), and the confidence bar.

---

## Step 5 — Voice input `[0:55–1:02]`

**Say aloud:**
> "Officers in the field don't have time to type. They can speak directly."

**Action:** Click the 🎤 microphone button. Speak clearly:  
> *"How many murders in Belagavi in 2025?"*

**Audience sees:** The interim transcript appears in the input box as you speak. When the mic stops, the query is sent automatically and the answer arrives. The Read aloud checkbox can be checked to have the answer spoken back.

---

## Step 6 — Network ring visualization `[1:02–1:15]`

**Say aloud:**
> "Beyond individual queries, DRISHTI reveals hidden connections. Here is the
> criminal network intelligence — organized crime rings detected automatically from
> repeat co-accused patterns across FIRs."

**Action:** Click **Network Intel** in the sidebar.  
**Audience sees:** Five detected crime rings listed on the left.

**Action:** Click any name inside Ring #1 (e.g. the first person's pill button).  
**Audience sees:** An interactive graph expands — the selected person at the center, with co-accused, linked FIRs, phones, vehicles, and financial accounts as nodes. Click **2** then **3** in the hops selector.

**Say aloud:**
> "Every node you see is a real entity in the database — no guesswork, full evidence chain."

---

## Step 7 — Financial ring visualization `[1:15–1:25]`

**Say aloud:**
> "For financial crime, DRISHTI traces circular money flows — the classic
> layering signature of money laundering."

**Action:** Sign out and log in as `analyst` / `drishti123`. Click **Financial Intel**.  
**Audience sees:** Three KPI tiles — transactions analysed, circular rings detected, flagged volume in rupees. Below, the suspicious-ring list and the money-trail graph.

**Action:** Click **Ring #1** in the left panel.  
**Audience sees:** The graph isolates the ring — accounts as nodes, transfers as directed edges, with the flow path visually tracing money returning to its origin.

---

## Step 8 — Switch to Live section `[1:25–1:32]`

**Say aloud:**
> "Everything you've seen runs on the synthetic demo dataset. Now watch what happens
> when we connect it to a real unit's own case files."

**Action:** In the top bar, click the **Demo** / **Live** toggle — click **Live**.  
**Audience sees:** The page reloads. Every page now shows empty states — no FIRs yet, no rings, no hotspots. The system is ready for real data.

---

## Step 9 — Register a case `[1:32–1:42]`

**Say aloud:**
> "An officer registers a new case — right here, directly in the system."

**Action:** Log in as `investigator` / `drishti123` if needed, then click **Case Files → + New Case File**.  
**Audience sees:** A clean new-case form.

**Action:** Fill in: Crime Type `Theft`, District `Bengaluru`, Police Station `MG Road`, a date of today, and a brief description such as `Vehicle stolen from MG Road parking`. Click **Register case**.  
**Audience sees:** The new case appears in the Cases list, with an auto-generated FIR number.

---

## Step 10 — Copilot answers from the new case `[1:42–1:52]`

**Say aloud:**
> "Instantly — without restarting anything — the Copilot knows about that new case."

**Action:** Click **Copilot**. Type:  
`Cases in Bengaluru this week`  
Press **Ask**.  
**Audience sees:** The just-registered theft FIR appears in the results. The intelligence layer computed from real data in real time.

**Say aloud:**
> "Every module — network, hotspots, forecast, offender risk — recalculates
> automatically as your unit's data grows."

---

## Step 11 — Audit trail as Supervisor `[1:52–2:00]`

**Say aloud:**
> "Finally — accountability. Every action in this demo is logged.
> A Supervisor can review the full audit trail."

**Action:** Sign out, log in as `supervisor` / `drishti123`. Click **Audit Trail** in the sidebar.  
**Audience sees:** A table of every action taken during this session — Copilot queries, page views, the new case registration — each row stamped with the acting role, timestamp, and detail. Nothing is hidden.

**Say aloud:**
> "DRISHTI: every answer backed by evidence, every action accounted for.
> That is intelligence built for Karnataka State Police."

---

## Presenter notes

| Timing risk | Mitigation |
|---|---|
| Claude API slow or unavailable | Pre-run the Copilot questions and have screenshots ready; the rule-engine fallback still answers correctly |
| Voice input not working | Chrome must have microphone permission granted; test before the demo |
| Live workspace case registration takes time | Pre-fill the form before going on stage; only click Register during the demo |
| Language switch pill shows wrong label | Ensure the `ಕನ್ನಡ` pill is visible before the Kannada step |

**Credentials used in demo order:**

| Step | Username | Password | Role |
|---|---|---|---|
| 2–7 | `investigator` | `drishti123` | Investigator |
| 7 | `analyst` | `drishti123` | Analyst |
| 9–10 | `investigator` | `drishti123` | Investigator |
| 11 | `supervisor` | `drishti123` | Supervisor |
