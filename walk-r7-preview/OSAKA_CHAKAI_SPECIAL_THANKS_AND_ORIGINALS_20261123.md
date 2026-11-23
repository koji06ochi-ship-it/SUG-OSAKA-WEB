# 大阪茶会 2026-11-23 — 原本保存／SPECIAL THANKS 実装状況

## 公式提供原本（この会話に添付）
- IMG_9399.jpeg / 25,354 bytes / SHA256 `6761873b5e3f3dcdc7b0f2f9fd67de65c85033f61a0a8cee9ffc116382035cde`
- BF95CA6A-6172-4BBA-9238-2106A0CF8537.jpeg / 635,203 bytes / SHA256 `fd635252531f4fda052bce7b9aae8489c3d573ce85709760c1a1ad91e1a07814`
- Original files were packed unchanged into `OSAKA_CHAKAI_R7_OFFICIAL_ASSETS_20261123.zip` (658,666 bytes; SHA256 `b44ec13b1425c93b18bcc9d634ffe63e3e7d753f5eb723abff505c39916d254f`) as a downloadable conversation artifact. Both entries verified byte-for-byte after ZIP creation.
- Tried to persist both files into Library folder `/S.u.G WALK/大阪茶会_公式素材_20261123`. Folder creation succeeded, but **both upload operations failed** with `library_storage_limit_exceeded`. Neither file was uploaded to Library. No deletion or overwrite attempted.
- GitHub binary asset upload was not executed: the current GitHub connector cannot take a local binary path and its blob/file write requires directly supplied UTF-8/base64 content. The images are NOT in the GitHub branch.
- Existing app currently loads logo/shop image from Osaka Chakai official-site URLs. Actual browser image-load result has not been verified and exact binary match to user-provided original is not asserted.

## Special thanks credit added and verified
On the Osaka Chakai MAP listing modal, after the description/contact links:
SPECIAL THANKS
CAFE 大阪茶会®
OSAKA CHAKAI

- Frontend commit: `7fe318ba1072062337dfad59abd33633580a04cb`.
- Preview backend pin commit: `0c448424812d787da8e85aa9e69e69f2b2f15a7a`.
- Preview URL: `https://sug-private-engine-25morfbar-sug1.vercel.app/walk-r7-preview/index.html`.
- Actual Preview HTTP 200 for map.html; confirmed code includes SPECIAL THANKS, brand name, Instagram URL. iPhone tapping/visual behavior NOT tested.

## Integrity
Original photos and logo never AI-redrawn or altered. Existing GPS, official 5 screens, 3D coordinates, SQL, production and AI billing unchanged. Do not silently claim original images were committed to GitHub.
