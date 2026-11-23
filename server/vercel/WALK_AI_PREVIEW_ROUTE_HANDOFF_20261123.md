# S.u.G WALK R7｜既存Vercel用AI認証確認APIのステージング
2026-11-23 JST
作業ブランチ：`walk-r7-special-integration-20261123`

## 今回作成
- `server/vercel/walk-ai.mjs`：将来`sug-private-engine/api/walk-ai.mjs`へ配置するVercel用の認証確認API。
- GET：`enabled:false`、`AUTH_PREFLIGHT_ONLY`、認証設定の有無だけ返す。
- OPTIONS：既知のGitHub Pages／プレビュー起点のみ許可するCORSプリフライト。
- POST：タスク・言語・500文字上限・セッション必須。既存Supabase Auth `/auth/v1/user` に照会。セッションが正しくても常に`503 SERVICE_DISABLED`、`paidRequestsAttempted:0`。OpenAI・Postgresは呼ばない。
- BODYの食事AIや既存WALK 5画面、正式3D MAP、SPECIAL、GPS、GAMEは変更なし。
- 既存`sug-private-engine`のGitHub連携は書き換えていない。連携済みリポジトリへのpushは自動Previewデプロイの可能性があるため実施なし。

## コードテスト
- GitHub上の現物ソースを再取得し、依存を模擬した隔離試験 **13/13 PASS**：
  1. GETはOFF、設定済み表示
  2. GETはOFF、未設定表示
  3. 不正な質問拒否
  4. 認証設定なしでPOST拒否
  5. トークンなしのPOST拒否
  6. 未許可Origin拒否
  7. 許可OriginのOPTIONS成功
  8. 未許可OriginのOPTIONS拒否
  9. 正常な模擬Supabaseセッションでも課金API停止
  10. 匿名セッション拒否
  11. 無効セッション拒否
  12. 認証プロバイダ障害時停止
  13. 過大リクエスト拒否
- **実HTTPサーバー・実Supabase Auth・実Vercel実行・実DBの同時実行は未検証。**
- 最初のテスト実行でV8隔離環境にResponse/URL/fetch等の標準グローバルがなく停止したため、隔離環境に専用のモックを注入して再実行して13/13に到達。ソースは変更不要だった。

## 現在確認されている接続
- 既存Supabase：`nnqzxcgkqjnmtzcvorha`、ユーザーのSQL画面で`r7_private`の2テーブル存在・RLS・基本権限確認済み。
- Vercel`sug-private-engine`のPreview環境に`SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY`登録・再読み取り確認済み。
- **DB接続用の`R7_PRIVATE_DATABASE_URL`は未登録**。DBへの実通信、料金上限の実停止は未検証。
- 上流有料AIを呼ぶコード・有効化は今回行っていない。

## 次の実接続
- 既存Vercelの`sug-private-engine`へ、この認証確認APIのみを**Preview環境限定**でデプロイする（自動デプロイ・URL公開・ビルド利用が起き得るため実施前に対象・条件の明示承認が必要）。
- Preview上でGETのOFF表示、CORS、実Supabaseセッションの検証を行う。
- サーバー専用DB接続情報／課金上限／請求照合の設定と実験は別工程。所有者の追加承認とコスト確認なしに行わない。

**判定：認証用Preview APIはコードとして作成し、隔離試験PASS。Vercel Previewデプロイと実接続はまだ実行していない。**
