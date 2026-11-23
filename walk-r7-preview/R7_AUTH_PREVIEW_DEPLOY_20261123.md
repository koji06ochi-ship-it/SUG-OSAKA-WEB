# S.u.G WALK R7｜Vercel認証確認APIをPreview限定でデプロイ
記録日: 2026-11-23 JST

## 実施対象と承認範囲
- ユーザー「いく」を、直前に提示した既存VercelのPreview限定デプロイの承認として受領。
- 対象Vercel: 既存Hobbyチーム `sug`, project `sug-private-engine`（`prj_3TqDJQp8dGs12o0yQMGbgL9Uas0g`）。
- 連携GitHub: `koji06ochi-ship-it/sug-private-engine`（既存非公開リポジトリ）。原本 `main` は変更なし。
- 新規別ブランチ: `walk-r7-auth-preflight-preview-20261123`（`main` から作成）。
- `api/walk-ai.mjs` 1ファイルだけ追加。原本BODYコード・既存食事AI・WALKの正式5画面・3D・GPS・SPECIAL・GAMEに変更なし。
- GitHubコミット `abda4fbbbf6a184cba3a77cf9e773995fb0ad91c`。
- Vercel Deployment `dpl_5iQmtp3erp6dpWSc29BKWUmwo1Sp`, preview URL: `https://sug-private-engine-cwlwa8fs4-sug1.vercel.app/api/walk-ai`。
- Vercelデプロイ情報では `state=READY`, `target=null`、対象ブランチ・コミット一致、ログに `Deployment completed` がある。
- Productionプロモートなし。本番APIコード・本番環境変数は変更なし。新規有料契約なし。

## 何を実装したか
- GET: APIの状態 `enabled:false`、`mode:AUTH_PREFLIGHT_ONLY`、公開しない設定値の有無（真偽）を返す。
- POST: 観光/翻訳・日本語/英語/中国語の要求を検証。Bearerが与えられた場合のみ既存Supabase Authへセッション確認。
- 正常なセッションでも `503 SERVICE_DISABLED` を返す。OpenAIは呼ばず、private DBも操作せず、LIVEも有効化しない。
- CORS: 既定のGitHub Pages/RawGitHack起点に限定。
- ユーザーのSupabase `nnqzxcgkqjnmtzcvorha` を引き続き利用し、新規プロジェクトなし。
- Vercel Previewだけに以前登録済みの `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` を使用。キー値は記録しない。

## 検証結果と限界
- デプロイ前の13/13隔離モックテストPASS。実トークン、HTTP接続、実プロバイダによる検証ではない。
- Vercel管理APIでデプロイ `READY`、既存別ブランチコミット一致、ビルド完了ログ取得。
- 外部のHTTPクライアントからPreview URLへのGETアクセスを試したが取得できなかった。保護画面等の原因は確定していない。Vercel Runtime Logsの対象デプロイには該当時間帯の記録なし。
- **実HTTP GETのJSON取得、実Supabaseセッション検証、認証前後の動作の実証は未合格。**
- API認証準備は進んだが、AI観光案内・自由文翻訳はまだ無効。アプリUIの認証連携・利用料金の実強制停止・private DBの本番接続・OpenAI実リクエストも未実施。
- Vercel Hobbyプラン。無断で有料枠を購入・更新せず、ビルド使用量や上限の影響はVercel管理画面で要確認。

## 次工程
- Previewの認証保護下で、既存ユーザーの承認済みセッションを使いGET/POSTの認証確認（Vercel CLI `vercel curl` などの正規経路）。トークンをチャット/GitHubに貼らない。
- 認証確認にPASSしても、有料APIはOFFを維持。
- 既存の別リポジトリであるWALKのUIからPreview APIを呼ぶには、許可された接続先と実認証トークンが必要。まだ組み込まない。
- 別工程でサーバー専用DB接続、実同時実行、プロバイダ課金の強制停止を確認し、追加費用・本番変更・API実リクエストの承認を得る。

**正確な判定：Previewの自動デプロイはVercel管理情報上READY。実HTTP/API認証のエンドツーエンド成功は未確認。**

## 追補：Vercelの保護設定を実測（2026-11-23）
- Vercel get_project `sug-private-engine` にて `ssoProtection.enabled=true` / `deploymentType=all_except_custom_domains` を確認。パスワード保護は `enabled=false`。
- このPreviewの通常の外部GETはVercel保護に阻まれている。作業コンテナからのDNS解決もできず、一般的なWebフェッチ経路でもAPIのJSONを取得できなかった。**アプリAPIのGETが失敗したという認定ではない**。
- Vercel公式コネクターには認証済みPreviewを読み取れる専用機能があるが、アクセスのために23時間有効な一時共有リンクを発行する副作用がある。従来の「無断公開禁止」に従い、そのアクセス方式は**未使用**。
- 公開範囲やSSO設定は変更しなかった。Supabaseの本物のユーザーアクセストークンの取得・送信も未実施。
- 本番環境・既存BODY・他のAPIは変更なし。すべての有料OpenAI呼び出しはOFF。
- 次の実API確認は、Vercelの保護を維持した認証済みHTTP経路（`vercel curl` 等）を用意してGET 200 JSON・OPTIONS・未認証POST 401・正式ユーザー認証POST 503を検査すること。その手段がこの会話から確保できるまでは、実通信PASSと判定しない。

## 追補：一時Preview共有リンクを明示承認のうえ作成して実GET成功（2026-11-23）
- ユーザーが一時リンクの作成を「する」と明示承認。Vercelの認証済みPreviewフェッチ機能を1回呼び出し、既存デプロイ`dpl_5iQmtp3erp6dpWSc29BKWUmwo1Sp`の`/api/walk-ai`を実HTTPで取得した。
- **実測結果：HTTP 200 OK**、`Content-Type: application/json`、`Cache-Control: no-store`。
- JSONレスポンス：`{"service":"walk-ai","enabled":false,"mode":"AUTH_PREFLIGHT_ONLY","authConfigured":true,"tasks":["sightseeing","translation"],"langs":["ja","en","zh"]}`
- Preview環境のSupabase認証設定がサーバーから読み取られ、APIのGET関数が応答できたことを実証した。
- VercelのSSO設定は維持。一時リンクは最大23時間の有効期限付きであり、本番公開やSSO解除は実施していない。リンクのトークン値は保存・出力していない。
- **未検証：実Supabase BearerセッションのPOST検証、ログアウト後拒否、AI回答、翻訳結果、DB費用上限の強制停止**。これらをPASSに含めない。
- 追加課金・有料API呼び出し・DB変更・本番デプロイなし。
- ランタイムログは指定期間内に表示なし。実HTTP応答を示す取得結果そのものを一次証拠とする。
