# S.u.G WALK R7 — Durable shared budget ledger handoff

Date: 2026-11-23 (JST)
Source: `walk-r7-ai-live-budget-guard-20261123`
Branch: `walk-r7-durable-budget-ledger-20261123`

## Owner decisions preserved
- Codex not used. No new paid service or contract.
- AI text + voice + LIVE all share a JPY 10,000 monthly maximum.
- JPY 1,000 is a non-spendable reserve. Spending allocation: AI text 2,000; voice 2,000; LIVE 5,000.
- Existing iPhone preview, five official screens, Osaka 3D map, GPS and trilingual phrasebook unchanged.

## Added files
- `server/sql/001_r7_budget_ledger.sql`: PostgreSQL 14+ monthly ledger, enforced CHECK caps, idempotent operation record.
- `server/r7-cost-ledger.js`: transactional server-only reservation and finalization routines, month-level row lock, Japan-local calendar month, replay prevention, category cap checks.
- This handoff.

## Tests
JavaScript syntax evaluation PASS.
11/11 deterministic unit cases PASS on an in-memory emulation of the database query interface:
1 initial 1000-yen reservation; 2 replay same ID; 3 settle 420 yen; 4 repeat settlement; 5 changed settlement rejected; 6 1581 yen exceeds remaining AI-text cap; 7 live 5000 yen reserved; 8 voice 2000 yen reserved; 9 remaining AI-text 1580 reserved; 10 even one yen more rejected; 11 provider cost over reservation rejected.

**These are mock-based behavioral checks, NOT a real PostgreSQL transaction/concurrency PASS.** The first mock scenario had two incorrect expected outcomes; calculation corrected and all 11 cases rerun. No further code edit was needed for that correction.

## Hard stops still in place
- HTTP AI and LIVE POST handlers remain 503 / fail closed.
- Database migrations have NOT been executed; no database has been provisioned.
- Authentication/session verification is NOT wired.
- No service provider keys, billing accounts, stream room creation, or provider price/usage reconciliation connected.
- Transactions have NOT been validated with real simultaneous Postgres connections.
- No production deployment or iPhone real interaction.
- Correct operation requires a database adapter with real transaction commit/rollback and server-side credentials.
- Provider cost overruns cannot be prevented solely by a reservation ledger: upstream enforced hard limits, strict model output caps, metering, and disabling requests on reconciliation divergence are mandatory.

## Deployment gate
1. Confirm actual no-cost account/environment and service limitations.
2. Obtain explicit approval before service activation, billing, account changes or deployment.
3. Apply SQL in protected PostgreSQL database, private role, deny client direct writes.
4. Implement server-verified user identity and role-based authorization before importing these functions into public POST endpoints.
5. Verify idempotency, month boundary, and concurrent budget reservation in real Postgres.
6. Connect upstream service hard limits and reconcile usage; demonstrate a real enforced monthly stop.
7. Test iPhone Safari, LIVE session capacity, end-to-end AI voice with measured costs.

No financial cap enforcement is claimed as active until steps 1–6 pass.
