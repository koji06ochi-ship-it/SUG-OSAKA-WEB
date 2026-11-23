# S.u.G WALK R7｜既存DB費用管理の接続アダプターを追加（2026-11-23 JST）

## 今回の変更（既存正式5画面、3D MAP、SPECIAL、BODY、GAMEは非変更）
- 新規 `server/r7-pg-adapter.js`：サーバー側から与えられるpg互換Poolを入力として、既存の `reserveCost(db,...)` / `finishCost(db,...)` が必要とする `db.transaction(fn)` / `tx.query(sql,params)` を提供。
- `BEGIN` → 処理 → `COMMIT`、例外発生時の `ROLLBACK`、接続の `release()` を実装。接続情報のハードコード、環境変数の参照、実DB接続、依存パッケージの追加は行わない。
- 新規 `walk-r7-preview/r7-pg-adapter.test.cjs`：外部接続なしでトランザクション制御を検査する再実行可能なテスト。
- 変更はGitHubの作業ブランチのみ。mainブランチ変更なし。デプロイ、購入、DBマイグレーション、課金操作なし。

## 今回のテスト
- 10/10 PASS（mock Poolの隔離テスト）：接続pool必須、callback必須、正常commit、callback例外のrollback、query例外のrollback、BEGIN失敗時の停止、COMMIT失敗時のrollback試行、SQL/パラメータ拒否、固定化されたtx表面、DB接続情報の非埋込。
- 最新GitHubの実ファイルから読み取り、テストと実装を評価した。
- `server/r7-pg-adapter.js`、`server/r7-cost-ledger.js`、`api/walk-ai.js`、`api/walk-live.js`、`server/r7-ai-readiness.js`、テストファイルのJS構文はすべてPASS。
- API実装の保全チェック：`walk-ai` / `walk-live` ともに引き続き停止（有料呼出しなし）、アダプターはAPIにimportされておらず自動有効化なし。

## 確認済み・未確認
- **確認済み**：既存費用管理が要求するdb.transaction/tx.queryインターフェースとのコード整合。Mockでのcommit/rollback/release。
- **未確認**：接続先Supabaseプロジェクト、データベース実認証、PostgreSQLのトランザクション分離・複数接続の競合、private schemaへの実アクセス、月額請求額、プロバイダ側の強制課金停止。これらが未完了なのでAI/LIVEはOFFを維持。
- Supabaseはインストール済プラグインだが、このセッションでプロジェクト/SQLツールが見えていないためDB操作を実施していない。
- 既存Vercelの `sug-private-engine` には `OPENAI_API_KEY` の登録名があるが、WALK用Supabase認証変数やprivate DB接続変数は、取得した一覧で見つからなかった。変数の値は取得していない。

## 次の環境ゲート
1. 既存Supabaseの正本を確認し、権限・費用・Private Schemaの存在を**読み取り専用**で検証。
2. 既存Vercelのサーバー実行環境とDB接続方式を確定。安全に保存したサーバー専用接続文字列だけを使う（ソースに含めない）。
3. 既存 `server/sql/001_r7_budget_ledger.sql` を実DBに適用する必要がある場合、変更前にオーナーの承認を受ける。
4. 実DB同時実行・タイムアウト・月跨ぎ・請求照合を検証し、上流強制上限の実装確認後にのみ有料APIの有効化を検討。
5. デプロイ、API料金発生、公開、購入や環境設定変更は承認前に実施しない。

**判定：DBアダプター実装とMock検証は完了。実Postgres接続・実際の料金制御・有料AI本接続は未実施。**
