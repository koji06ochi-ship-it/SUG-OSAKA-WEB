# S.u.G OSAKA Instagram Stories — unpublished implementation

Work date: 2026-11-13 (client Japan date). Base: afc7f9e03f28c83bb7422a4ea630bb74809d6ea3.
Target: https://koji06ochi-ship-it.github.io/SUG-OSAKA-WEB/
Account: ko_ji.sug. Completion status: NOT COMPLETE; real authorization and media verification pending.

## Implemented
- Existing Instagram section only: circular entrance using existing assets/logo.png, white/black/gold; original Behold remains.
- Native dialog, portrait image/video, previous/next, video controls/inline muted playback, image auto advance, Escape, focus restoration, direct Instagram link.
- Missing media URL or load failure uses Instagram link; no invented URL, no scraping.
- timestamp + 24 hours determines expires_at locally (not an API-supplied field). Invalid/future timestamps excluded. Browser checks each second and on foreground. Empty/failed/stale feeds hide the entrance; open expired viewer closes.
- Server-side Node collector supports explicitly configured Instagram/Facebook API hosts, version, ID and secret. Checks exact username and ID before reading stories, cursor pagination, finite request limits, 15-second timeout, no credential logs, allowlisted output/media domains.
- GitHub Actions on standard public Ubuntu runner. 15-minute polling, not instantaneous delivery; scheduling and CDN delays are possible. Browser refreshes once per minute. After 30 minutes without fresh data it hides stories.
- Feature branch has no push/PR workflow trigger. Workflow also requires master, public repository, and INSTAGRAM_STORIES_ENABLED=true. All are kept inactive pending approval.
- Proposed publication writes only stories.json to a separate stories-data branch; frontend reads the public raw JSON. No master writes or Pages rebuild per poll. Only IDs, timestamps and CDN URLs are stored, no media files. Git history retains old JSON; expiration means hidden on HP, not erasure from Git history. Review this retention before activation.

## Current verified facts
- Repo is public, default branch master, GitHub connector reports push/admin permission.
- apps-tools.html separation exists. api/instagram.js exists but is an older normal-media handler; no active backend deployment found in repository. GitHub Pages does not execute it. It was left unchanged.
- Behold feed EOU475Uzd3dkeWdPn3RH returned username ko_ji.sug and 6 posts in an actual unauthenticated JSON request. This establishes a live feed, not successful widget rendering or account plan.
- Meta browser reached official developer login screen offering Facebook and managed Meta account. Not signed in, app ID/permissions/token/linked Facebook Page unknown. No token in local environment variable names. GitHub Secrets inventory is unavailable through connector; existence there is unknown.

## Sources checked and limits
1. https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login
   Verified official text: professional businesses/creators; Facebook Page not required; instagram_business_basic scope replaces old business_basic.
2. https://developers.facebook.com/docs/graph-api/reference/shadow-ig-user
   Verified official v27.0 text: stories edge exists. This alone does not verify the target account's authorization.
3. https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
   Official Meta collection search excerpt: Facebook Login requires linked Facebook Page. Detailed permissions require confirmation in the app.
4. https://behold.so/docs/json-feeds/ and https://behold.so/docs/api-feeds-reference/
   Documented normal posts/images/videos/reels/albums. No documented story output was established.
5. https://behold.so/pricing/
   Free plan: 1,200 views/month, 1 source/feed, 6 posts, daily updates. Actual account subscription not inspected.
6. https://docs.github.com/en/billing/concepts/product-billing/github-actions
   Standard public-repository GitHub runners are free. Implementation uses no cache/artifact uploads, larger runners or paid service.

Official documentation follow-up: retrieved the current Stories, IG Media, Business Login, Overview and rate-limit pages directly from Meta (Markdown/HTML responses) after search-tool 429s. Verified: timestamp is publish time, thumbnail_url is video-only, Stories are available for 24h, Live Video and reshares are excluded. expires_at remains locally derived. The 2026-07-30 changelog confirms media_url is omitted for copyrighted/licensed audio including Instagram's music library, even for owned videos; missing URL is not an API failure. Image/video display cannot be promised for every story.

Instagram Login: professional account, no linked Facebook Page, instagram_business_basic. Long-lived token is 60 days; GET graph.instagram.com/refresh_access_token with grant_type=ig_refresh_token can renew an unexpired token at least 24h old. Expired tokens require reauthorization. `scripts/refresh-instagram-token.mjs` implements a server-only refresh helper, with injected approved durable secret-store adapters; no scheduler or secret storage is activated. It never returns tokens to a public caller or logs them. GitHub secret rotation permissions and storage still require approval and implementation before long-term operation.

Facebook Login: linked Page required. Stories reference requires instagram_basic + pages_read_engagement; Page roles granted through Business Manager have additional ads_read/ads_management conditions. pages_show_list is needed for Page discovery. Do not use Instagram token refresh for Facebook tokens; actual token lifetime/data-access expiry/scopes must be inspected after authorization.

Rate limits vary by token/use case. Official reference includes Platform 200 x users per rolling hour and Instagram BUC 4800 x impressions per 24h; neither is a universal per-account quota. Actual headers/app dashboard must be checked after authentication. Polling is bounded, but no live quota/permission verification has occurred. Current Overview also mentions Unified Login for new integrations; retain the actual existing app's chosen product after login rather than silently replacing it.

Additional primary sources:
- https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/stories
- https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
- https://developers.facebook.com/documentation/instagram-platform/overview
- https://developers.facebook.com/documentation/instagram-platform/changelog
- https://developers.facebook.com/docs/graph-api/overview/rate-limiting/

Existing Vercel sug-private-engine project was found read-only, but its free allowance/commercial-plan suitability and suitability for this endpoint remain unverified. No environment or secret was read or changed. The existing inactive GitHub collector remains the proposed integration; no second viewer or alternative hosting deployment was added.

## Activation prerequisites (do not skip)
1. Complete Meta login in held developer screen; select existing app or explicitly approve creation. Determine which Login product is configured. Read current story/media/token docs in authenticated dashboard.
2. Confirm least-privilege read permissions. Instagram candidate: instagram_business_basic. Facebook candidate: instagram_basic plus applicable Page permissions; pages_show_list for discovery. Do not request content publishing/messaging unnecessarily. Confirm Standard/Advanced access and account roles against actual app configuration.
3. Verify GET /{version}/{IG_ID}?fields=id,username then GET /{version}/{IG_ID}/stories?fields=id,media_type,media_url,thumbnail_url,timestamp. Test real image and video. Preserve sanitized field-presence evidence only, not raw tokens.
4. Determine token expiry and refresh mechanism from actual token type. Connect and verify the refresh helper with approved secret storage, or implement renewal alert before long-term operation; present exact secret destination for user approval. Never paste tokens in chat or commit them.
5. After approval, put token in GitHub Actions secret INSTAGRAM_ACCESS_TOKEN; configure repository variables INSTAGRAM_USER_ID, INSTAGRAM_LOGIN_MODE (instagram/facebook), INSTAGRAM_API_VERSION (verified version). Do not enable INSTAGRAM_STORIES_ENABLED yet.
6. Finish browser tests and iPhone Safari physical-device verification, actual expiration/empty account tests, authenticated integration and regression tests. No live form submission during regression without approval.
7. Obtain publication approval before merging feature branch into master and enabling INSTAGRAM_STORIES_ENABLED. Confirm Pages configuration and data-branch initial publication. Verify live results after activation.

## Tests and remaining work
`node --test tests/stories.test.mjs`: 7 tests passed (mock data only): expiration boundaries/order/duplicates, empty/stale, unsafe URLs, collector pagination/account/output, auth/config/error rejection; refresh persistence and expired/young-token handling.
`node tests/browser.cjs`: not executed successfully. Playwright bundled Chromium/WebKit absent; installed Chromium fails with socket() Operation not permitted in this execution sandbox. No browser PASS, screenshots, iPhone or PC rendering claim.
Browser test fixture generation: ffmpeg -f lavfi -i color=c=black:s=360x640:d=2 -c:v libx264 -pix_fmt yuv420p /tmp/sug-story-fixtures/video.mp4. Serve repo on port 8765. Mock external routes; fixtures never inserted into production data.
Static preservation check: index diff contains only story links/markup/script/style additions. All previously tracked files except index.html unchanged; prices, form, apps-tools, logo/assets byte-identical to base.
No actual Meta call, token exchange/refresh, production publication, paid service, or paid workflow execution performed. Additional cost incurred: 0 yen.
