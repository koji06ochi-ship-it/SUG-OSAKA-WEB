# R7 AI + LIVE authenticated endpoint integration — 2026-11-23

## Fixed requirements
- Codex remaining credits preserved; no Codex used.
- AI text/voice/LIVE combined JPY 10,000 monthly **owner ceiling**; paid actions require separate approval.
- Existing R7 map, 5-screen UI, GPS persistence, language guide, and private PostgreSQL ledger remain unchanged.
- No deployment, new provider account, payment, API key, DB mutation or LIVE room was performed.

## Implemented in this branch
- `server/r7-auth-gate.js`: shared fail-closed login verification, no credential logging.
- `api/walk-ai.js`: verify request format, require validated Supabase session before any future AI processing; all paid operations remain 503.
- `api/walk-live.js`: require validated Supabase session before any future stream creation; all paid operations remain 503.
- GET remains a public read-only disabled status response.

## Source-level checks (mock environment only)
10/10:
1 AI GET shows disabled
2 LIVE GET shows disabled
3 AI POST with missing auth config returns 503
4 LIVE POST with missing auth config returns 503
5 Client-supplied permission override rejected as invalid request
6 Missing bearer authorization rejects without provider lookup
7 Auth mock accepts verified user ID
8 Auth mock rejects invalid token
9 Auth mock outage fails closed
10 Both POST handlers still lead to paid-service disable gate

The first test harness lacked Node globals `process`, `fetch`, `URL`, and `AbortController`; this caused harness errors and two false negatives. They were supplied as **test-only stubs** and all ten checks were repeated successfully. No production source change was needed to fix the harness.

## Missing / NOT verified
- Supabase account/project discovery through connector (no project/SQL tools exposed in the active session).
- DB migration applied to real PostgreSQL, real concurrent locking and transactions.
- Actual Supabase HTTP authentication and deployment.
- Durable monthly invoice enforcement, atomic provider reservations actually wired to POST handlers, upstream provider quotas.
- AI answers, three-language live voice translation, stream creation, multi-user LIVE, iPhone device operation.
- Browser hosting is GitHub Pages; a serverless `api/` directory in this repository is **not automatically hosted by GitHub Pages**. An approved backend hosting deployment is needed.

## Next safe milestone
Before any real paid work, establish a no-cost backend host + protected database connection, authenticate real sessions, verify concurrent budget reservations and provider-side hard limits, then request explicit owner approval for activation.
