# S.u.G WALK R7 — Six neon feature integration handoff
2026-11-23 JST
Branch: `walk-r7-six-neon-features-20261123`
Reference baseline: `walk-r7-4stores-exact-3d-20261123`
Parent: `walk-r7-venue-pulse-20261123`

## Owner decisions
1. Existing LIVE/sale active venue neon pulse with badge and external 17LIVE links.
2. Real GPS-only daily/cumulative pink-neon trace and locally counted approved spots.
3. 10-second cinematic 3D replay camera along **recorded** GPS trace.
4. 10-minute guerrilla sale phrase / verified expiry.
5. Anonymous proximity firework — only with bilateral informed opt-in.
6. Friday 21:00, 30-minute Okawa walking step challenge — real aggregate steps only.

Preserve five tabs, black/pink neon, river, park, historical approved four-venue colors and exact building verification, official logo, GPS, 2D fallback. Do not add fabricated users, coordinates, attendance, steps, sales, or paid media provider.

## GitHub source changes performed ON THIS ISOLATED BRANCH
- `osaka-3d.js`: 10-sec camera replay using saved real GPS segments only. LIVE/sale marker badges, selected venue emissive pulse and ground ring. Approx. 60ms animation timer; stops on background/no verified active venues and map close. One-to-one venue matching uses verified OSM building footprints.
- `map.html`: existing map tab gains 今日/累計, 10秒3D飛行, 撮影クリーン表示, 限定特典, 花火同意 toggle, 大川チャレンジ buttons. Existing 5 main tabs unchanged.
- `neon-walk.js`: bounded private localStorage data for approved walking segments, Japan-local day splits, re-read after reload. Existing saved distance key remains unchanged.
- `neon-events.js`: sanity checks for expired coupons (max 10 minutes), live session validity, verified 30-minute Friday 21:00 aggregate, consent-gated anonymous proximity event.

## Observed verification (source and isolated JavaScript evaluation)
17/17 tests passed covering 4 JS/HTML syntax checks, initial zero display data, accepted segments, reload restore, bad segments/stale rejection, next-day/accumulated switching, 10-minute expiry, absent group verification, and required proximity consent.
Source code parsed via V8 `new Function`; this is **NOT `node --check` with real files**, a browser run, or an iPhone screen test.

## Production status and blockers
- **Baseline prerequisite NOT met**: actual all-four-store 3D color/geometry validation has not been demonstrated. Browser tool requires originating browser context; no Mapbox/OSM runtime screenshots available in this session.
- 10-second camera replay visually untested: frame timing, appearance, mobile performance and short-route handling are unverified.
- LIVE store status and guerrilla phrases need a trusted/admin-controlled backend, Supabase project and realtime feed; currently no actual LIVE/sale is injected or displayed as fact. The policy helper alone does not authenticate server responses.
- Two-party nearby matching requires actual opt-in service with strong precision, retention, and privacy controls; ON button records temporary local consent ONLY. No actual detection/network sharing is started.
- Group challenge needs an authenticated step tally and fraud handling; button currently reports backend not connected. It will not pretend collective success.
- Clean display CSS/iPhone 9:16 interaction untested.
- No source assets, Mapbox token, provider integration, existing original or live production was changed. No charges or Codex were consumed.
- No merge to master/production, no deployed API and no paid video streaming.

## Next gate
Demonstrate four approved venue structures with real Mapbox/OSM, device/browser screenshot + diagnostics, then test the new feature branch at iPhone 393x852. Separate passing source tests from user-visible render/runtime PASS. Before any Supabase schema migration, broadcast platform, cross-user analytics or deployment obtain owner approval and confirm cost.
