# S.u.G WALK R7 — Backend hosting read-only audit
Date: 2026-11-23 (JST)
Branch: `walk-r7-live-role-guard-20261123`

## Read-only findings
- An existing Vercel team `sug1` owns a Vercel project named `sug-private-engine` (project ID `prj_3TqDJQp8dGs12o0yQMGbgL9Uas0g`).
- Vercel's latest inspected deployment for that project is `dpl_25zgsNtjGQHR7wYLMvzno1TYpRC9`, state `READY`, connected to private GitHub repository `koji06ochi-ship-it/sug-private-engine`.
- Its deployment branch is `walk-r7-neon-pink-contrast-20261123`, commit `479069a67f3a88ca521f3939eadb398dcca84ad9`. This is NOT the latest public-preview R7 branch with the fully restored water, park and building layers.
- All AI, LIVE, private budget-ledger and auth-gate code in this project has been developed in `koji06ochi-ship-it/SUG-OSAKA-WEB` on the `walk-r7-live-role-guard-20261123` branch.
- The inspected Vercel project is NOT presently serving these new AI/LIVE server files. `READY` only confirms that a DIFFERENT deployment was built.
- Read-only GitHub tree of `sug-private-engine` on that deployment branch did not show the corresponding `api/walk-ai.js` or `api/walk-live.js` files.
- Vercel's API returned no team plan field in the inspected get-team/get-project outputs, so this audit does NOT claim the user is on Hobby/Pro/Enterprise.
- Vercel's official current terms restrict **Hobby** to personal, non-commercial usage. S.u.G WALK's planned paid subscriptions/listings mean Hobby must not automatically be assumed suitable for commercial production.
- Sources: https://vercel.com/legal/terms and https://vercel.com/pricing

## Safety decisions
- No Vercel deployments, promotions, new projects, GitHub private repository writes, API secret configuration or paid service calls were performed.
- No change to existing iPhone map preview, GPS persistence, official five screens, or existing app assets.
- Codex unused. Total AI/voice/LIVE spending policy remains JPY 10,000/month, with JPY 1,000 nonspendable reserve.

## Blockers before real AI/LIVE operation
1. Verify team pricing plan and ensure production use complies with terms and JPY budget.
2. Select appropriate backend service and confirm deployment ownership/destination and auto-deployment effects.
3. Get explicit approval before any deployment, contract, paid service, public release, database mutation or overwriting an existing project.
4. Verify actual database access, separate application roles, concurrency-safe ledger behavior, provider hard caps, and authenticated service access.
5. Measure real iPhone Safari AI/voice and permitted stream use; do not label code-only checks as runtime PASS.

## Next non-destructive path
Continue developing + testing in the protected source branch, keeping all paid POST routes OFF. Do not merge into the linked `sug-private-engine` repository until the owner has authorized a specific hosting/deployment approach.
