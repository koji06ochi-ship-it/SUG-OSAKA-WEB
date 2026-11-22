# S.u.G WALK R7 — LIVE role authorization handoff
Date: 2026-11-23 JST
Parent: `walk-r7-auth-endpoint-tests-20261123`
Branch: `walk-r7-live-role-guard-20261123`

## Confirmed requirements preserved
- Existing five screens, Osaka map/neon, GPS persistence, offline trilingual tourism, AI chat disabled state retained.
- No Codex, no provider spending, no service deployment, no database creation or alteration.
- All AI+voice+LIVE expenses must remain within JPY 10,000/month, with a nonspendable JPY 1,000 reserve.
- Pipi's 17LIVE external link integration is a separate, low-cost option; no 17LIVE account link or API is created here. Future Pink Man challenge show is not in this implementation.

## Changes
- `server/r7-supabase-auth.js`: derive `canBroadcast` ONLY from Supabase Auth's server-returned, administrator-controlled `app_metadata.sug_walk_live_broadcaster === true`. Reject user-editable `user_metadata` for authorization. No claim of permissions from browser input.
- `server/r7-auth-gate.js`: propagate the verified flag and authorize the requested viewer/host role; absent or unknown roles are denied.
- `api/walk-live.js`: require verified auth and the appropriate LIVE role, then continue to return 503 SERVICE_DISABLED. No stream token, paid media call, or room creation.

## Source-level mock tests
10/10 PASS (mocked Supabase user endpoint, no external service requests):
1. Authenticated account is allowed viewer role.
2. Ordinary viewer is denied host role.
3. Explicit administrator-managed broadcast flag can satisfy host authorization.
4. Unverified account denied.
5. Unknown role denied.
6. Authenticated user with app_metadata broadcaster=true yields true.
7. user_metadata broadcaster=true alone yields false.
8. app_metadata broadcaster=false yields false.
9. LIVE POST with missing auth configuration returns 503.
10. LIVE GET declares disabled.

No deployed HTTP server or iPhone Safari operation was tested; use of injected browser/runtime stubs in code evaluation does not imply real Node network behavior.

## Production blockers
- Supabase project/account read access unavailable in current tool session.
- Real Supabase authentication, RLS enforcement, and PostgreSQL parallel transactions untested.
- No owner-approved media provider, host entitlement issuance, server-side token service, participant-minute metering or hard cost reconciliation.
- AI + LIVE remain explicitly disabled and must not be activated from public browser flags.
- GitHub Pages does not execute API JS in `api/`. Backend hosting setup would require a separate approved deployment.

## Official security basis
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid

## Next safe step
Use an actual existing free backend project to read configuration first, then request explicit approval for any project modification/deployment. Never add billable operations until server-hard spending and usage controls pass real integration tests.
