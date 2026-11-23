# S.u.G WALK R7｜既存BODY AI基盤の再利用・WALK専用契約実装
日付：2026-11-23 JST
対象ブランチ：walk-r7-special-integration-20261123
最後の画面キャッシュ更新：3177c3778b26d361b07db37dd8257f57d9ab5b1d

## 実際に確認した既存資産
- GitHub `koji06ochi-ship-it/SuG-BODY-MANAGEMENT-SYSTEM/api/food-analyze.js`: Vercelサーバーで`OPENAI_API_KEY`環境変数を使用してOpenAI Responses APIへ接続する食事写真解析処理が存在。現時点のデプロイ稼働・費用条件・リクエスト成功は未検証。
- GitHub `koji06ochi-ship-it/sug-private-engine/api/v1/meal-analyze.mjs`: 認証されたSupabase利用者の食事写真解析API。BODY側クライアントから呼ぶ設計。WALK用の観光質問／通訳を実装しているわけではない。
- SUG-OSAKA-WEB の既存`server/r7-auth-gate.js`、`server/r7-supabase-auth.js`、`server/r7-cost-ledger.js`、`api/_r7-budget-policy.js`を確認。WALK用の認証・費用予約モジュールはすでに存在するが、本番DB接続／競合試験／請求実績の照合／上流の強制課金上限は未確認。
- 既存の月額予算方針：AIテキスト2000円、音声2000円、LIVE5000円、使用不可の予備1000円、合計最大1万円。これは課金の承認ではない。

## 今回の変更
1. `server/r7-ai-contract.js` 新規：観光（sightseeing）／自由文翻訳（translation）の共通API入力形式、JA/EN/ZH、500文字上限、余計なキーや精密座標／トークンらしい入力の拒否、用途別system指示作成。
2. `api/walk-ai.js` 更新：共通入力を使って正当な認証を要求、GETで有効化なしと対象用途を表示。POSTは認証後でも503で停止し、有料OpenAI APIを呼ばない。BODY APIへの変更なし。
3. `walk-r7-preview/ai-chat.js` 更新：観光質問／自由文翻訳の用途切替、翻訳先言語の選択を追加。既存のオフライン定型文通訳を使える案内を追加。現在は必ず初期OFFで、明示されたサーバー安全条件が整わない限りAI送信不可。
4. `walk-r7-preview/map.html` 既存AIクライアントの参照バージョンを更新。
5. `walk-r7-preview/index.html` MAP/HOME iframeの読み込みバージョンを更新。
6. `walk-r7-preview/r7-ai-contract-regression.test.cjs` 新規：純関数契約、異常入力、無課金のサーバー停止動作を試験する隔離テスト。

## 今回確認したテスト（GitHubからコードを再取得）
- API入力タスク／言語／翻訳先の検証、入力上限、精密座標・Bearer様の文字列の拒否、観光・翻訳のsystem指示、GETはdisabled、ログイン済み想定のPOSTでも503、無効入力400、クライアントのJS構文：21項目PASS（隔離試験）。
- `api/walk-ai.js`にはOpenAI APIへ向かうfetchや秘密鍵を追加していない。既存のサーバー料金制御は未接続。
- 今回は実際のOpenAI回答・翻訳応答・音声認識・ブラウザーでの操作・iPhone実機を試験していない。成功報告に含めない。
- 保存したテストをローカルで再検証する場合：`node walk-r7-preview/r7-ai-contract-regression.test.cjs`
- 既存R7のGPS、OSAKA 3D、HOME/SPECIAL/5タブ、正式原画、外注GAMEは変更なし。main未変更。
- API契約の認証フローを独立テストでスタブ化しているだけ。実際のSupabaseセッション検証や同時実行・デプロイは未確認。

## 本接続に必要な条件
1. 既存Vercel／Supabase側の実行環境、API・認証が正常に利用できるか読み取りのみで確認する（権限・料金条件を調べる）。
2. サーバーのみの鍵とWALK独立エンドポイント／利用者認証を接続し、BODY食事解析を変更しない。
3. 実DBで月次原子的予約・競合検査・支出額照合・上流強制利用上限が機能することを確認。
4. 有料API、サービス設定変更、公開・デプロイを伴う操作はユーザーの明示承認後に限定する。
5. 許可後に低額の実リクエストを測定し、観光・翻訳の応答品質、iPhone入力・中断・認証失効・課金停止を検査する。

**判定：WALK専用の入力契約・UIとfail-closed API準備は実施。実AI接続・回答・音声通訳の完成判定は未達。**

## Vercel読み取り確認（追補：2026-11-23 JST）
- 連携Vercelのプロジェクト一覧に `sug-private-engine` と `sug-body-management-system` が存在。
- `sug-private-engine` 最新表示のデプロイ記録は `READY`（UTC 2026-11-22 21:01、ブランチ `walk-r7-neon-pink-contrast-20261123`）。
- BODYは最新表示のデプロイ記録が `READY`（UTC 2026-08-31 07:21）。
- `READY` はデプロイの管理状態に過ぎず、APIリクエスト成功・正しいモデル・資格情報有効・課金上限の保証ではない。
- 現在確認できたVercelプロジェクト一覧に `SUG-OSAKA-WEB` 名のプロジェクトは含まれない。今回更新したWALKのプレビューは静的GitHub配信であり、`/api/walk-ai`のサーバー実行はここでは行われない。
- 既存BODYの食事画像解析をWALKへ直接流用することは不可。WALKの新契約を既存の実行基盤へ展開し、サーバー認証・費用上限・CORSを再確認する必要がある。
- 本確認はVercelの読み取り専用一覧・デプロイ記録から取得。環境変数の中身は取得していない。デプロイ・DNS変更・請求操作・API実呼び出しはしていない。
