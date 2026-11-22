# S.u.G WALK R7 — Supabase Free readiness & verification handoff

Date: 2026-11-23 JST
Branch: `walk-r7-supabase-free-hardening-20261123`
Parent: `walk-r7-durable-budget-ledger-20261123`

## Confirmed existing restrictions
- Combined AI text, voice, LIVE: JPY 10,000 maximum per calendar month. JPY 1,000 is an unspendable safety reserve; AI text JPY 2,000, voice JPY 2,000, LIVE JPY 5,000.
- No Codex, no extra charges, no service subscription activation, no existing public app modification.
- AI and LIVE HTTP POST handlers remain disabled by default (503), so no actual chargeable provider requests are initiated.

## Free tier verified from official Supabase pricing
- $0/month Free, up to 2 active projects, 500 MB Postgres, 50,000 monthly active auth users.
- Free projects can pause after ~1 week of low activity. Do not promise 24/7 availability.
- Source: https://supabase.com/pricing
- Security references: https://supabase.com/docs/guides/database/postgres/row-level-security
- Changes in Supabase documentation are frequent; reconfirm these before production activation.

## Actual project connection status
- Plugin directory says the Supabase plugin is installed/enabled, but this session did not expose callable Supabase project/SQL tools.
- Therefore no account/project listing, database provisioning, migration or remote query was performed.
- No credentials have been requested, stored or placed in GitHub.

## This branch changes
1. `server/sql/001_r7_budget_ledger.sql`: move both ledger tables into the `r7_private` schema, revoke `PUBLIC`/`anon`/`authenticated` privileges and enable RLS.
2. `server/r7-cost-ledger.js`: query `r7_private` tables only, with existing row locks, idempotency and cap checks unchanged.
3. `server/r7-supabase-auth.js`: new **server-only** helper that checks a session using Supabase Auth's `/auth/v1/user` endpoint, restricts host to HTTPS *.supabase.co, rejects anonymous users and invalid IDs, and returns only the verified user ID.

## Tests and limits
- Supabase Auth mock tests 7/7 PASS: valid identity, missing config, malformed bearer token, malicious host, malformed user ID, anonymous user, upstream rejection.
- NOTE: the first test harness returned AUTH_NOT_CONFIGURED for all test cases because the isolated JavaScript test environment does not provide URL/AbortController globals. A separate test harness supplied stubs for those standard Node globals; 7/7 mock cases passed. Production Node URL/AbortController behavior and real Supabase Auth HTTP remain unverified.
- Source syntax for the helper and private-schema ledger verified; no PostgreSQL binary was available in this environment.
- The earlier branch's ledger tests were mock tests, **not** real concurrent Postgres transactions.
- No real server endpoint or database migration PASS.
- No LIVE video stream, AI reply, free-tier project, or account creation.

## Next production gates
1. Make Supabase project SQL tools available and inspect an existing Free project without changing it.
2. Confirm project has unused free-tier allowance, no automatic paid upgrade, and private schema not listed in exposed schemas.
3. Obtain user approval before any project creation, DB schema changes, service activation, or nonfree action.
4. Test the private-schema SQL in real Postgres with roles/grants and concurrent cost reservation (10+ simultaneous transactions).
5. Implement server-side authenticated identity check and separate role-based authorization for LIVE broadcaster versus viewer.
6. Implement production budget reconciliation and upstream enforced caps; do not enable paid endpoints from browser flags.
7. End-to-end iPhone Safari test (GPS, auth, AI, voice, LIVE, session expiry, cost stops).

## Budget safety
The ledger enforces **reservations**, not upstream actual billing. A provider can still charge over reservation due to measurement delay or usage differences. Therefore the system cannot promise an actual hard JPY 10,000 invoice cap until upstream spending limits, bounded requests/stream lifetimes, measured invoice reconciliation and failsafes have been tested.

## Ownership and preservation
Existing map, GPS code, 5-screen navigation and tour-guide files are not modified by this branch. Parent commit history is preserved.
