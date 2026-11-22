# S.u.G WALK R7 — AI/LIVE server gate implementation result

Date: 2026-11-23 (JST)
Source branch: `walk-r7-tour-guide-trilingual-20261123`
Working branch: `walk-r7-ai-live-budget-guard-20261123`

## Scope
- AI and LIVE **combined** monthly limit: JPY 10,000, not permission to spend.
- Codex usage: none.
- No provider signup, API key, deployment, paid tier, LIVE room creation or real AI call.
- Earlier R7 map, GPS walking distance persistence, offline trilingual tourist guide and existing five-screen navigation unchanged.

## New source
- `api/_r7-budget-policy.js`: shared limits and hard prerequisites.
- `api/walk-ai.js`: GET status, request validation, POST denied with 503.
- `api/walk-live.js`: GET status and proposed participant-minute limits, POST denied with 503.
- `walk-r7-preview/AI_LIVE_BUDGET_GUARD_20261123.md`: financing and authorization requirements.

## Confirmed source-level tests
9/9 checked:
1. Missing all server prerequisites => disabled
2. Cost category allocations sum to JPY 10,000
3. Proper Japanese query accepted by validator
4. Unexpected approval flags rejected
5. Questions longer than 500 chars rejected
6. Unsupported languages rejected
7. No LIVE token issuing code
8. Both POST endpoints deny paid operations
9. No API secret literal in the new source

## Not verified or not implemented
- Actual serverless deployment and real GET/POST HTTP calls
- Real authenticated sessions, durable ledger with atomic spending reservations, provider-side hard ceilings
- Provider API keys, AI text responses, microphone transcription, translation and speech model operations
- Real-time room creation, publisher/viewer permissions, broadcaster shutdown or billing metering
- iPhone Safari audio/microphone/network and multi-user LIVE
- Subscription, invoices, exact provider costs or currency conversion

## Safety invariant
A user-controlled browser flag or budget estimate must **never** enable paid operations. Until a durable shared spending ledger, true server-side user authentication, and independently approved upstream quotas exist, both server-side POST endpoints must remain denied. No automatic paid retries or overage plans.

## Next engineering integration
- Select a genuinely free persistent transactional ledger/auth configuration first; verify limits and terms.
- Implement atomic reservation and reconciliation with budget categories for both services.
- Require explicit approval before any account linking, deployment, key creation or chargeable service.
- Verify real server HTTP and iPhone only after backend safeguards are in place.
