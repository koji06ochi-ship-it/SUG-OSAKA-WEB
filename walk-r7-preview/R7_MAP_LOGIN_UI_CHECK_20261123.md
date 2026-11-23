# S.u.G WALK R7｜MAP内ログインUI検証（2026-11-23）
作業対象：既存公開GitHub `koji06ochi-ship-it/SUG-OSAKA-WEB` の `walk-r7-special-integration-20261123`。本番ブランチ、BODY、Vercel設定の変更なし。

## 今回の実行
- 最新 `walk-r7-preview/map.html`, `auth-session.js`, `ai-chat.js` をGitHubから再取得し、MAPの「観光案内・通訳」モーダルが既存 `tour-guide.js` とログインUIに接続されていること、`auth-session.js` を `ai-chat.js` より前に読むことを確認。
- MAPモーダル `.modal-panel` に `overflow-y:auto` と `max-height:82vh` があることをコード確認。iPhone画面での実表示は未確認。
- JS隔離環境に模擬DOMと模擬Supabase通信を入れてログインUIのクリック経路を検証。**12/12 PASS**：
  1. MAP→観光案内への導線とスクリプト読み込み順
  2. ログインパネル表示部品
  3. パスワード入力欄のマスク
  4. 有料AI送信初期OFF
  5. ログイン時に /auth/v1/token→/auth/v1/user の2段階照合
  6. 送信時のパスワード欄消去
  7. 成功時の認証表示と内部ログイン状態
  8. ログイン後も有料AI送信OFF
  9. ログアウトでセッション破棄・未認証表示
  10. パスワード誤り時のエラー表示
  11. トークンのブラウザー永続保存なし
  12. OpenAIへの課金リクエストなし
- 初回テストモックが `insertBefore` を持たず失敗したので、**テスト用DOMのみ修正**。次にステータス抽出がタイトルを拾うテスト側の誤りを修正し、12/12となった。ユーザー画面の不具合と誤認しない。
- **実機ブラウザーでGitHubのPreview URLへのアクセスは失敗**（作業コンテナの外部DNS解決不可、Web側もCDN取得不可）。実画面の表示・配置・クリックをPASSと報告しない。

## 実証済みと未検証の切り分け
- 実証済み：GitHub上の既存ソース接続・画面イベントの模擬DOM操作12項目。
- 以前実証済み：Vercel Previewの `GET /api/walk-ai` と `GET /api/walk-ai?authProbe=1` が200、Supabaseへの実到達・無効トークン拒否。
- 未検証：本物のブラウザーによるMAP画面操作、実Supabaseユーザーのメール・パスワード認証、Vercel保護下PreviewへのユーザーPOST、AIの実回答、iPhone実機。
- ユーザーのメール・パスワード・トークンはChatGPT側に取得しない。
- 本工程で有料API呼び出し・新規アカウント作成・DB変更・課金・デプロイはしていない。

## 次に必要な検証
本物のブラウザー環境で、正式5画面Preview→「MAP」→「観光案内」→「認証を確認」を操作し、UI表示とSupabaseの本物のログイン結果をユーザーの端末上で確認する。実パスワードはチャットへ送らず、ログイン結果だけ共有する。SSO保護済みVercel Preview APIの認証POSTは別経路で検証する。
