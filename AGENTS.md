<!--
Purpose: Stable agent working contract for this repository.
Current role: Defines reading order, authority order, hard rules and session discipline for any agent or human.
Last meaningful change: Created 2026-10-06 at clean-rebuild start (audit phase, no app code yet).
Constraint/dependency: Supersedes old repos' AGENTS.md; aligned with Desktop/01_CONSOLIDATED_ANALYSIS.md baseline.
-->

# AGENTS.md — Panchavati Daily Duty (clean rebuild)

One station: Panchavati Police Station, Nashik City. Marathi-first, Unicode. One clerk user (for now).

## Reading order (before any task)

1. `docs/CURRENT_STATE.md` — what is actually built and verified right now
2. `docs/DOMAIN.md` — entities and rules
3. `docs/ARCHITECTURE.md` — how the pieces fit
4. `docs/OPEN_QUESTIONS.md` — what must not be guessed
5. The task's relevant slice of code
6. `reference/` evidence only when the task touches chart content or print

`docs/INITIAL_AUDIT.md` is the historical decision baseline for why this repo exists and what was reused/discarded from the old repos.

## Authority order (when sources disagree — record, never guess)

1. `reference/ORIGINAL_VISUAL/` PDFs — visual authority
2. Human-verified Unicode XLSX/HTML (`reference/EXCEL_RECONSTRUCTION/`) — exact text/cell authority
3. `reference/SEMANTIC/` — secondary semantic authority
4. `docs/` — decision authority for software behavior
5. Research/analysis — input only
6. Current code + passing tests — implementation truth

If evidence is ambiguous: stop, implement the representable part, record the ambiguity in OPEN_QUESTIONS.

## Hard rules (never violated)

- The human clerk chooses all personnel. No autonomous scheduling, replacement, or "smart fills". Software calculates, flags and renders only.
- `रिक्त` (vacant seat) ≠ `बंद` (closed location) ≠ `बिमा` (per-assignment beat-marshal qualifier). BIMA is an explicit field; never infer BIMA or other operational semantics by regex/parsing Marathi notes (no `remarks_mr` parsing for machine meaning, ever).
- Finalized chart = immutable snapshot. Amendment = new version. Copy-previous never modifies the source chart.
- PostgreSQL is the single store. Physical PDF pages are render output, not domain truth. Never create page-specific tables; never hardcode page geometry into the domain.
- No information loss from authoritative source charts; secondary info goes to detail panels, not the trash.
- Marathi text wraps, never truncates. Protected tokens (CCTNS, Dial 112 MERS, DB, MERS, rank codes PI/API/PSI/PROB_PSI/GPS/ASI/LASI/HC/LHC/PN/LPN/PC/LPC, TOTAL, Office, ME) are never translated or transliterated. Canonical spellings: बिमा (never विमा), पोशि (never पोषि). Devanagari digits are a display transform only.
- Unfinished features are "Coming Soon" and disabled — no half-usable controls.
- Never modify `reference/` files.
- Never edit an applied migration; add a new one.
- No police operational data leaves the machine (no external AI/API calls with chart data, no cloud services in the runtime).

## Coding mode

1. Read the slice's docs + code.
2. Smallest coherent change consistent with the contract.
3. Run `npm run check` (typecheck + invariants + tests) when code changes; run print verification via browser preview when print/UI changes.
4. Report what changed and what was verified — never claim a check that didn't run.
5. If code conflicts with a settled doc decision, surface it; fix code to match unless the user changes the decision.

## Session discipline (end of every coding session)

Update in this order of importance:
1. `docs/CURRENT_STATE.md` — implementation truth + verification status
2. `docs/OPEN_QUESTIONS.md` — new ambiguities discovered
3. `docs/TRACEABILITY.md` — source → requirement → implementation → test mappings touched
4. `changes/<id>/proposal.md` — for active work units
5. Tiny maintenance header on new/substantially changed files (Purpose / Current role / Last meaningful change / Constraint) where idiomatic; never pollute generated files

## Skills

Use the project-local skills in `skills/` (source-forensics, db-change, current-chart-ui, print-check, verify-slice, session-handoff, event-annex) when the task matches. The IDE's native browser preview, terminal, search and todos cover the rest. Do not install large generic skill packs.
