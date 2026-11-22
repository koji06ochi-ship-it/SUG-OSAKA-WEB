# S.u.G WALK R7 — Budget ledger regression verification
Date: 2026-11-23 JST
Branch: `walk-r7-supabase-free-hardening-20261123`

## Work performed this turn
- Checked the execution environment: `psql`, `postgres`, `pg_ctl`, Python `psycopg`/`psycopg2` not installed.
- GitHub sources fetched and inspected. No existing database, subscription, API key, service deployment or repository release was changed.
- Added `server/tests/r7-budget-ledger.test.mjs`: Node 22 built-in `node:test` and `assert` regression tests requiring no external dependencies. Intended command: `node --test server/tests/r7-budget-ledger.test.mjs`.
- Ran the complete test body in an isolated JS environment with imports adapted to injected assertions and the exact current `server/r7-cost-ledger.js` source. This verifies code behavior, **not** a native Node test command invocation.
- Source file retrieved after GitHub commit and content matched.

## Execution results: simulated 9/9 PASS
1. JPY 10,000 top-level cap and unspendable JPY 1,000 reserve.
2. First reservation, idempotent duplicate, settlement and identical second settlement.
3. Category limit blocks excess and leaves state unchanged.
4. AI text 2,000 + AI voice 2,000 + LIVE 5,000 cumulative limit.
5. Provider actual amount above reserved maximum rejected without state change.
6. Cancellation releases held budget, repeat cancellation idempotent.
7. Duplicate operation ID with altered amount rejected.
8. 40 asynchronous LIVE reservations of 500 yen: exactly 10 accepted, 30 rejected, balance 5,000 yen.
9. Invalid operation ID, category, or amount rejected.

## Critical qualifications
- The simulator serializes transactions in application memory to model a monthly DB row lock. Real PostgreSQL concurrency, isolation levels and RLS are **not verified**.
- Native `node --test` has **not** been executed (repository files are connected via GitHub tooling, not mounted into the terminal).
- No real Supabase plugin project SQL tools are available in this chat despite plugin installed/enabled status.
- No remote database or real provider HTTP request was attempted.
- No actual invoice cap is enforced at the provider: AI and LIVE API POST endpoints remain disabled (503).
- Free project availability, cost, service status and billing settings must be inspected before any connection/creation.
- 40 parallel simulated calls are not LIVE viewers and not real-money billing.

## Next steps (no-charge and no mutation first)
- Gain authenticated access to existing Supabase project read-only status/limits, or a controlled PostgreSQL environment.
- Run existing SQL migration only after explicit database-change approval.
- Run Node test natively and real PostgreSQL concurrent reservation tests; inspect RLS and schema grants.
- Confirm provider-side hard spend controls and authentication before enabling paid AI or LIVE.
- Keep Codex untouched and retain all original R7 public app, 5 screens, GPS, visual map and original assets.
