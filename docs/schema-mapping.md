# DRISHTI ↔ Official KSP FIR System Schema Mapping

DRISHTI's database aligns with the official **Police FIR System — ER Diagram** (Karnataka Police
Department). Every entity from that document exists in DRISHTI with its official name and columns:
run `SELECT * FROM CaseMaster` (or `Accused`, `Victim`, `Employee`, `Unit`, …) against
`data/drishti.db` and you get the official shape.

## How the alignment works

Physical tables are snake_case; the official PascalCase surface is a set of SQL views created by
the v2 migration (`src/lib/db/schema.ts`). This keeps the official contract stable while letting
the application evolve underneath.

| Official entity | Physical table | Notes |
|---|---|---|
| `CaseMaster` | `firs` | All official columns present (CrimeNo, CaseNo, category/gravity/head/status/court FKs, incident window, lat/lon, BriefFacts) |
| `Accused` | `case_accused` | + `resolved_person_id` (see below) |
| `Victim` | `case_victims` | + `resolved_person_id` |
| `ComplainantDetails` | `complainants` | Occupation/Religion/Caste FKs per official schema |
| `ArrestSurrender` | `arrest_surrender` | IO, court production, arrest state/district |
| `ChargesheetDetails` | `chargesheet_details` | A = Chargesheet, B = False Case, C = Undetected |
| `Act` / `Section` | `acts` / `sections` | Real BNS 2023 / IT Act / NDPS / Arms Act sections with operative text |
| `ActSectionAssociation` | `act_section_association` | Per-case charged sections |
| `CrimeHead` / `CrimeSubHead` / `CrimeHeadActSection` | `crime_heads` / `crime_sub_heads` / `crime_head_act_section` | Every DRISHTI crime type is an official sub-head |
| `CaseCategory` / `GravityOffence` / `CaseStatusMaster` | `case_categories` / `gravity_offences` / `case_status_master` | Category codes match CrimeNo first digit (1=FIR, 3=UDR, 4=PAR, 8=Zero FIR) |
| `CasteMaster` / `ReligionMaster` / `OccupationMaster` | `caste_master` / `religion_master` / `occupation_master` | Caste stored as administrative categories — synthetic data stays neutral |
| `Court` / `District` / `State` | `courts` / `districts` / `states` | One sessions court per district |
| `Unit` / `UnitType` | `units` / `unit_types` | Self-referencing hierarchy: State HQ → District Police Office → Police Station |
| `Employee` / `Rank` / `Designation` | `employees` / `ranks` / `designations` | Rank hierarchy DGP(1) … PC(12); registering officer + IO on every case |

## CrimeNo format

Official 18-digit format, exactly as specified:
`[1-digit category][4-digit district][4-digit unit][4-digit year][5-digit serial]`
e.g. `104430006202600001` — an FIR (1) in Bengaluru City (0443), unit 0006, year 2026, serial 00001.
`CaseNo` is the last 9 digits. Serials run per unit + category + year, generated with
`MAX(serial) + 1` (see `nextCrimeNo` in `src/lib/db/seedV2.ts`).

District codes are synthetic but stable; Bengaluru City uses `0443` to match the worked example
in the official ER document.

## The entity-resolution layer (deliberate extension)

The official schema records accused and victims **per case**: `Accused.PersonID` is a within-case
sort label (`A1`, `A2`, …), and nothing links the same human across two FIRs. That model cannot
answer "has this person offended before?" or "who is connected to whom?" — the repeat-offender
and network questions at the core of the problem statement.

DRISHTI therefore keeps a global `persons` table as an **entity-resolution layer**. Every official
per-case row (`case_accused`, `case_victims`, `complainants`) carries a `resolved_person_id`
pointing at the resolved identity. The official fields and lookups are preserved verbatim; the
resolution layer sits on top — which is exactly what makes Modules B (network intelligence) and
E (offender risk) possible.

```
Accused (FIR 1) "Ravi Kumar", A1 ─┐
Accused (FIR 2) "Ravi Kumar", A2 ─┼─→ resolution layer ─→ global person (one identity)
Accused (FIR 3) "R. Kumar",  A1 ─┘                         powers network + repeat-offender intel
```

## Labeled augmentations beyond the official dataset

These tables have no official counterpart and are explicitly synthetic extensions supporting PRD
modules B (network) and G (financial): `assets` (phones, vehicles, bank accounts), `fir_assets`,
`transactions`. `audit_log` is application governance infrastructure (Module J2).

## Migration mechanics

- v1 tables are untouched; the v2 migration is **additive only** (new tables + nullable columns on
  `firs`), applied via `PRAGMA user_version` in a transaction (`applyMigrations` in
  `src/lib/db/schema.ts`). Existing databases migrate in place on next boot.
- Seeding determinism: the original demo dataset is generated from a seeded mulberry32 stream; all
  v2 data draws from a **second stream** (`SEED + 1`), so the original 480 FIRs are byte-identical
  before and after the migration.
- The live workspace gets reference data (org hierarchy, legal lookups, officers) and official
  columns for its real cases, but no synthetic complainants/arrests are invented for user-entered
  records.
