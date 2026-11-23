# S.u.G WALK R7 — SPECIAL integration handoff (2026-11-23)

## Scope
- Repository: `koji06ochi-ship-it/SUG-OSAKA-WEB`
- Branch: `walk-r7-special-integration-20261123`
- Base: `walk-r7-six-neon-features-20261123` (`79df18dbf646cf3c11282a6925bd1634fc847d21`)
- Changes: `walk-r7-preview/index.html` (one script include), `special-bridge.js`, `special.html`, `special-asset-01.js` through `special-asset-08.js`.
- Official five tabs and MAP unchanged. No merge to main, no production deployment, no paid API calls.

## Visual source
- User-supplied `S.u.G_WALK_R7_SPECIAL.html` SHA-256: `05614fbeeb55625e249e2fca71a443f2c8440b20b5912901ca038c32f151c953`.
- Source embeds the same transparent PNG twice. The exact base64 was split into eight ordered JavaScript parts to keep GitHub per-file writes manageable; `special.html` reassembles the identical image into the two original image elements. No AI redraw.
- The four entries remain REEL / OSAKA NIGHT / LIVE & OFFERS / GAME, with no fake GPS, scores or remote status.

## Bridge
- `index.html` loads `special-bridge.js` after the existing unified app script.
- A temporary floating `✨ SPECIAL` button appears on HOME only. It opens an overlay iframe `special.html`, above the existing five-tab bar.
- `SUG_CLOSE_SPECIAL` is accepted only from the same-origin SPECIAL iframe and restores the originating tab. `SUG_SPECIAL_ROUTE` is not yet connected to real features; the SPECIAL page shows its honest unconnected sheet.
- This temporary HOME button is not a final visual design. The user-approved HOME design must be respected in a later UI refinement.

## Verification (code/static only)
- GitHub compare against base: exactly 11 changed/added files, with no changes to home/map/meet/log/settings or any MAP JS.
- All 8 GitHub asset chunks byte-for-byte equal to the supplied image base64 segments.
- The HTML references all eight chunks and has the back message and four cards.
- Existing five iframe IDs and five tab buttons still present.
- Node syntax checks on locally reconstructed SPECIAL inline scripts: PASS.
- Actual browser/iPhone navigation, Mapbox SDK render, verified four 3D storefronts: NOT TESTED. Browser navigation was blocked by environment; do not report runtime PASS.

## Next test gate
Run in an allowed browser/Work context on the branch preview: HOME > SPECIAL > Back, all five tabs, JA/EN/ZH, scroll at 393x852, Pink Bear image load and no console errors. Only after this, decide whether to merge or deploy. No automatic GitHub Actions or paid-service triggers should be started without approval.
