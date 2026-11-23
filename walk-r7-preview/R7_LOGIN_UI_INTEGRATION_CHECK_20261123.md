# S.u.G WALK R7｜MAP→観光案内の既存SupabaseログインUI接続検証
2026-11-23 JST
作業対象：`SUG-OSAKA-WEB` の `walk-r7-special-integration-20261123`（`master`・本番未変更）

## 今回の目的と範囲
既存の正式5画面を維持し、MAP内の観光案内・通訳パネルに追加した認証UIが、実際の画面コードにつながっているかを確認する。本人の認証情報は取得しない。OpenAIは起動しない。

## 実行結果：GitHubソース再取得による隔離DOMテスト 14/14 PASS
- `map.html` で `auth-session.js` は `ai-chat.js` より前に読み込まれる。
- `tour-guide.js` は観光案内パネル内で `SUGR7AIChat.mount` を呼ぶ。
- メールとパスワードの入力2つが生成される。
- パスワード欄はtype=password。
- ログイン・ログアウトのボタンが生成される。
- 有料AI送信はdisabledのまま。
- 初期は未認証と表示。
- モック認証で「認証済み」と表示。
- ログイン送信時にパスワード入力欄がクリアされる。
- 認証エンドポイント2回（token, user）だけを模擬して利用。
- OpenAIへの呼び出しはゼロ。
- ログアウトでセッション破棄。
- パスワード不一致のモックでエラー表示。
- 失敗後のセッション保持なし。

## プレビュー環境について確認できたこと
- GitHubリポジトリ `koji06ochi-ship-it/SUG-OSAKA-WEB` はpublic、既定ブランチは`master`、GitHub Pagesは有効。
- 変更は作業ブランチのみ。従ってGitHub Pagesの現在の本番公開画面に今回のログインUIが反映されたとはいえない。
- `raw.githack.com` の作業ブランチURLのWeb取得は現行の検証環境から成功しなかった。Chromiumで実ブラウザー表示・タップ・入力・画面キャプチャの結果はない。
- Preview専用`sug-private-engine/api/walk-ai.mjs`は別のVercelプロジェクトにあり、Auth前段GETは過去の実通信検証でPASS。WALK画面と認証済みAPIを結んだPOSTは未実施。
- **公開外部プレビューURLで本物のアカウントパスワードを試すことを勧めない**。認証情報を入力する前に、信頼できる自分の配信元（既存GitHub Pages本番か確認済みの保護Preview）での実画面確認が必要。

## 判定と次工程
- 14項目は**隔離DOM/HTTPモックのコード挙動PASS**。実iPhone・Chrome/Safari操作・実SupabaseユーザーログインPASSではない。
- 既存原本・BODY・MAP・SPECIAL・ゲーム・本番公開・Vercel本番環境・DBテーブル・請求・OPENAI_API_KEYは変更なし。
- 次：信頼できるテスト用配信元で実ブラウザーの5画面→MAP→観光案内→ログインUI表示を確認する。画面と認証が確認できるまで課金AIはOFF。
