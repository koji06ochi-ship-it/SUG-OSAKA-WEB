# S.u.G WALK R7 — AI / voice / LIVE budget gate (2026-11-23)

## Owner-fixed budget / no automatic authorization
- Total allowed operating cost **at most JPY 10,000 / calendar month**, shared across AI text, speech translation, LIVE infrastructure, and their related APIs.
- Internal allocation: AI text JPY 2,000; speech JPY 2,000; LIVE JPY 5,000; reserve JPY 1,000.
- This document is a **budget policy**, not authorization to activate paid services. No API key, LiveKit room, billed video stream, or deployment is created by this change.
- Codex must not be used; existing R7 five pages, map, GPS, design, and original assets preserved.

## Controls before turning on any chargeable service
1. Obtain explicit approval for provider, plan, and chargeable action.
2. Server-side identity and authorization. Never expose provider secret keys in public JavaScript or commit them to GitHub.
3. Server-side atomic monthly **reservation** of the maximum possible amount per operation, across requests, with a persistent ledger. Reject requests without a valid ledger or reliable cost ceiling.
4. Set independent upstream **enforced** caps when supported, with a safety margin. OpenAI project hard spending caps may lag tracked usage; a project alert alone is not sufficient.
5. LIVE must have a strict participant-minute limit: 1 host + 9 viewers x 30 minutes = 300 participant-minutes. Stop accepting new participants when allocation is exhausted. Unknown audience/stream duration means no broadcast allowed.
6. Reconcile provider invoice usage against ledger; disable further requests if divergence appears, or any cap/usage report cannot be read.
7. Never enable automatic paid-tier upgrade or on-demand overages. All service consumption begins in disabled mode.
8. Never persist a user's precise location in AI prompts, chat logs, or analytics without separately obtained informed consent.

## Current verifiable implementation
- 3-language, six-spot offline guide and eight pretranslated phrases implemented, no AI API calls.
- The separate AI chat connector is disabled by default unless a trusted backend endpoint is explicitly configured. A missing endpoint must not cause network requests.
- No LIVE streaming backend connected yet. A stream must not be presented as functional before token-service auth, publisher/viewer permissions, microphone/camera consent, usage metering, and iPhone tests.
- Frontend UI and code can be checked independently; **real AI conversation, voice translation, iPhone Safari operation, and LIVE streaming remain unverified**.

## Official pricing / limits reviewed 2026-11-23
- https://developers.openai.com/api/docs/pricing
- https://developers.openai.com/api/docs/guides/spend-limits
- https://docs.livekit.io/deploy/admin/quotas-and-limits/
- https://livekit.com/pricing
- https://developers.cloudflare.com/durable-objects/platform/pricing/

## Acceptance gates
- A: API disabled by default; no provider request.
- B: backend missing => visible error, never false success.
- C: browser cannot read API secret.
- D: durable budget ledger blocks requests before quota and remains accurate after restart/concurrency.
- E: LIVE audience and duration cap enforced server-side.
- F: iPhone display, input, text answer, mic permission, disconnect, recovery, and cost metering measured on device.
A/B/C can be tested locally; D/E/F are **pending** until a service is selected/configured/approved.
