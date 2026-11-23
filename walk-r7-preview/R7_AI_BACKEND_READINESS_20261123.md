# S.u.G WALK R7｜AI本接続前・既存環境の読み取り監査／無課金実装修正
確認日：2026-11-23 JST
作業ブランチ：`walk-r7-special-integration-20261123`
既存BODY・既存Vercel・Supabaseのデータは変更なし。追加課金、実OpenAI呼び出し、DB作成、環境変数変更、デプロイは実施していない。

## 既存Vercelの読み取り結果（プロジェクト・環境変数のキー名のみ）
- Vercelチーム `team_GMVuqyE3oisJ8kUITBvVK0yq`
- `sug-private-engine`（`prj_3TqDJQp8dGs12o0yQMGbgL9Uas0g`）の環境変数キー（値は見ていない）：
  - `OPENAI_API_KEY`（preview/production、sensitive）
  - `GOOGLE_MAPS_API_KEY`（production、sensitive）
  - `ALLOWED_ORIGIN`（preview/production、sensitive）
  - `SUG_BOOTSTRAP_TOKEN`（preview/production、sensitive）
- `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` はこの環境変数一覧に存在しなかった。既存WALK `requireR7User` は両方が未設定なら `AUTH_UNCONFIGURED` で停止する。コード側に勝手に公開鍵や固定URLを埋めない。
- `sug-body-management-system`（`prj_D8T25Tm7ZeteyC6AgW9EdkwncKow`）では列挙された環境変数の登録はゼロ件だった。環境変数一覧だけで別経路の資格情報を否定するものではない。
- VercelのREADY履歴は確認済み。ただし実API・課金上限・認証の成功を意味しない。
- Supabaseの専用プロジェクト一覧・DB SQL実行ツールはこのセッションで利用不可。実DB/私有スキーマ/料金プランは未検証のまま。

## 再利用するWALK資産
- `api/walk-ai.js`：観光質問・翻訳の入力契約。認証チェック後も必ず503停止し、AI課金呼び出しなし。
- `server/r7-auth-gate.js` / `server/r7-supabase-auth.js`：既存JWTのサーバー照会。匿名ユーザー拒否。
- `server/r7-cost-ledger.js` / `server/sql/001_r7_budget_ledger.sql`：月次費用予約、DB接続・本番競合検証未実施。上流モデル請求額の強制上限ではない。
- BODYの食事解析とは別API。既存BODYの機能、コード、環境変数を上書きしない。

## 今回のコード修正
- `walk-r7-preview/ai-chat.js`：将来WALKを本接続する際、既存認証から一時的に `getAccessToken()` を受け取る方式に変更。ログインアクセストークンがない場合は送信しない。認証ヘッダーにのみ使用し、localStorage・sessionStorage・Cookie保存・ログ出力なし。
- **実際の認証プロバイダーの実装は未接続**。入力フラグ `enabled=true` だけでは有効化されない。既存のサーバー認証と強制停止前提を維持。
- `walk-r7-preview/map.html` の読み込みバージョン更新。
- `walk-r7-preview/index.html` のMAP/HOMEキャッシュ更新。
- `walk-r7-preview/ai-client-auth-regression.test.cjs`：8ケースのネットワーク無し・仮DOMテストを追加。

## 実施検証
- 8/8隔離テスト：初期OFF、認証関数未登録OFF、無効トークンは送信ゼロ、有効な模擬トークンでのみ模擬HTTP POST、認証ヘッダー、モック応答表示、保存領域へのトークン書込なし、同一オリジンの固定APIパスのみ。**モックであり実API送信ではない**。
- `index.html`, `map.html`, `ai-chat.js`, テストコード、`api/walk-ai.js`, `server/r7-ai-contract.js`, `server/r7-auth-gate.js`, `server/r7-cost-ledger.js` のJS構文PASS（静的）。
- 既存MAPの3D・GPS・五画面・SPECIAL・GAME外注枠に実装変更なし。
- Browser/iPhoneの操作成功、OpenAIの実応答、音声通訳、サーバーデプロイ、料金請求額を今回PASSとは扱わない。

## 次の本接続ゲート（要承認/実環境）
1. 既存Vercel/Supabaseの利用可能枠・費用条件、本人が使用するSupabaseプロジェクトの正本を確認。
2. `SUPABASE_URL` と公開可能なクライアントキーが認証用サーバーへ適切に登録されているか確定。値・秘密キーはチャット/GitHubに貼らない。
3. WALKユーザーのログイン操作と `getAccessToken()` を実際のSupabaseセッションに接続。パスワード・Bearer Tokenをアプリログやブラウザー永続領域に出さない。
4. 実PostgreSQLで private ledger とトランザクション同時実行・月跨ぎ・異常時ロールバックを試験。
5. API上流での強制停止・使用量照合・モデル指定・タイムアウト・プロンプト安全策を検証。
6. サーバーデプロイ・有料AI利用・設定変更はユーザー承認後に実施。実APIは初めて承認済みの少額リクエストで試験する。
7. iPhone Safariで認証・日本語観光質問・英語／中国語翻訳・ログアウト後拒否・音声・GPSとの分離を実操作。

**判定：既存環境の設定確認と無料の認証クライアント改修は実施。WALK有料AI本接続は未実施・未承認。**
