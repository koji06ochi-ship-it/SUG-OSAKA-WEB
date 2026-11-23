# S.u.G WALK R7 — iPhone Auth/Preview Verification (2026-11-23)

## Scope
- Existing R7 five pages and original assets unchanged on published master.
- Frontend working branch: `walk-r7-auth-ui-bridge-20261123`, HEAD `e3b94e8eabbf87b7d8c93fba555410a049d4c714`.
- Backend Preview branch: `walk-r7-public-auth-config-20261123`, commit `31f5fe052de649df26d4d76b3129cfa38749dbca`.
- Preview URL: `https://sug-private-engine-6k6vda9wj-sug1.vercel.app` (READY).

## Evidence and actual result
- Auth bootstrap GET without Origin via authenticated Vercel inspection returned HTTP 403 and `{"error":"ORIGIN_REQUIRED"}`. This is the API's expected origin gate, not evidence of successful browser CORS.
- Backend source allows exact origins `https://koji06ochi-ship-it.github.io` and `https://raw.githack.com`, and specifies Access-Control-Allow-Origin and GET/POST/OPTIONS for approved origins.
- Vercel project settings previously indicated Vercel SSO protection enabled for deployments. Official Vercel docs confirm that protected Preview cross-origin browser calls require separate protection handling; preflight OPTIONS may be blocked by deployment protection.
- The published GitHub Pages master remains separate from the new auth-UI branch. No iPhone deployment exists for this branch.
- Backend is `AUTH_PREFLIGHT_ONLY`: real AI calls always return disabled (no billing).
- Supabase Preview variable names registered: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`. Values not copied into source.

## PASS / NOT PASS
- PASS: API process responds with JSON on a protected diagnostic fetch (403 origin gate).
- PASS: Branch code references for auth UI and backend bootstrap checked.
- NOT TESTED: Browser OPTIONS/GET with actual Origin, iPhone Safari sign-in, cross-origin cookies, authentication session persistence.
- NOT PASS: End-to-end iPhone login and AI text response. Do not claim completion.

## Blockers / safe next step
1. The front-end branch needs an explicitly authorized Preview deployment before iPhone testing.
2. Vercel Authentication currently protects the backend Preview; do not silently turn it off or create a public share link. A protected CORS exception, a deliberate access mechanism, or a same-origin staging environment must be approved and tested.
3. Real account credentials must never be pasted into chat or committed. No paid AI request is authorized.
4. Once Preview access is arranged, test Origin preflight, unauthenticated response, login with an existing account, refresh/recovery, logout and iPhone UI, and record HTTP status plus screenshots without leaking tokens.

No production change, database migration, paid API activation or credential disclosure was made in this check.
