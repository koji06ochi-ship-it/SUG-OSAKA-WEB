# S.u.G WALK R7｜Vercel Preview の既存Supabase認証設定（実施記録）
確認日：2026-11-23 JST
作業ブランチ：walk-r7-special-integration-20261123

## ユーザー確認済みのSupabase
- プロジェクト ref：`nnqzxcgkqjnmtzcvorha`（東京 ap-northeast-1、既存無料プラン）。
- ユーザーが作成SQLを実行し成功報告。さらに読み取り専用SQLの実画面で `r7_private.r7_budget_month` と `r7_private.r7_budget_operation` の2テーブルの存在、RLS有効、anon/authenticatedのスキーマ・テーブル直接アクセス遮断が両方trueと確認。
- この検査は基本的な権限確認であり、実Postgresのトランザクション・DBパスワード・上流課金停止の実証ではない。

## 今回実施したVercel設定変更
- Vercelチーム：`sug`（Hobby）。対象：既存 `sug-private-engine`（`prj_3TqDJQp8dGs12o0yQMGbgL9Uas0g`）。
- GitHub連携元：`koji06ochi-ship-it/sug-private-engine`。SUG-OSAKA-WEBとは別のリポジトリである。
- 既存BODY `api/v1/meal-analyze.mjs` の公開用Supabase URL/Publishable Keyを照合し、ユーザー画面のプロジェクトrefと一致することを確認。
- **Vercel Previewのみ**、`SUPABASE_URL` と `SUPABASE_PUBLISHABLE_KEY` をencryptedで追加。両方とも作成後のVercel環境変数一覧から存在・target=previewを再確認。
- キーの値は引き継ぎ記録に含めず、production環境変数は変更しない。既存のOPENAI_API_KEY等の値も取得しない。
- 本番デプロイ、プレビューの新規デプロイ、GitHub連携元のコード変更、AI API呼び出し、DB接続、料金発生は実施していない。

## 現在の正確な判定
- Vercel PreviewのSupabase Auth設定2件：**登録・再取得確認済み**。
- この設定だけではWALK APIは動かない。現在のWALK用 `api/walk-ai.js` は別のGitHubリポジトリ `SUG-OSAKA-WEB` にあり、`sug-private-engine` の既存Vercelデプロイには載っていない。
- 既存BODY `api/v1/meal-analyze.mjs` はSupabase URL/Keyをコードに直接定義しており、今回の環境変数追加が既存BODYの動作を変えたという証拠はない。
- `R7_PRIVATE_DATABASE_URL`（プライベートDB接続文字列）は未登録。値はユーザーからチャットで受け取らず、Vercelのサーバー専用設定へ安全に登録する必要がある。
- 実DBの競合・課金上限・上流支出強制停止・WALKログインUI・iPhone実操作は未検証。AI/LIVEはOFFを維持。

## 次の実作業（課金・デプロイ・本番変更の承認ゲート）
1. 既存Vercelの実行形式（`api/*.mjs`）に合わせ、WALK専用APIと認証を**別ブランチで**統合する計画を確定する。連携リポジトリにpushすると自動Previewデプロイが走り得るため、承認なしにpushしない。
2. private ledgerを呼ぶためのサーバー専用Postgres接続方法と最小権限を確認し、接続文字列をソースやチャットに出さない。
3. 実DB同時実行・請求額照合・上流プロバイダの強制上限を確認してから、明示承認を得て有料AIを起動する。

**今回の成果はVercel Preview認証設定の登録。実AI本接続・実DB接続・料金上限の検証は未完了。**
