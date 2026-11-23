# S.u.G WALK R7｜既存ユーザー認証UIのクリック操作検証
検証日: 2026-11-23 JST
作業ブランチ: `walk-r7-special-integration-20261123`

## 実施目的
既存5画面のMAP内「観光案内・通訳」パネルのメール・パスワード入力、認証確認、ログアウトを検証する。
BODY・有料AI・本番の変更は禁止。

## 取得した実ソース
- `walk-r7-preview/auth-session.js` blob SHA `6e7a49fc598cf58246d0071d5505de9d678eda94`
- `walk-r7-preview/ai-chat.js` blob SHA `faa336c2d269b7d52d5d1e30f72ecbab2eedcd19`
- `walk-r7-preview/map.html` blob SHA `ffa82b7c5e356d6a256b3a9fe5d3f7861860dcce`

## 検証方法・結果
実GitHubファイルを再取得し、DOM/HTTPを模擬した隔離JavaScript実行環境で、UIイベントを実際に起動。
**14/14 PASS（モックによる操作・ロジック試験）**：
1. MAP側に観光案内パネル起動導線あり
2. `auth-session.js` が `ai-chat.js` より先に読み込まれる
3. email/password入力欄が2つ存在
4. AI送信ボタンは初期OFF
5. 未認証表示がある
6. 認証ボタン押下によりSupabaseへの2つの模擬HTTPリクエストを実施
7. 入力欄のパスワードを押下後クリア
8. 認証済み表示が切り替わる
9. 認証後も有料AIボタンはOFF
10. 自動再試行・余分な送信なし
11. ログアウトで未認証表示へ戻る
12. 認証失敗時は一般的なエラー表示（入力パスワードは出さない）
13. 認証失敗後に認証済み状態を保持しない
14. 認証情報をlocalStorage/sessionStorage/indexedDB/cookieへ永続化しない

検証中のネットワークは全件モック。**実Supabaseログインや実HTTP POSTは未実行**。

## 実画面確認の制約
- この検証セッションではローカルのChromium起動自体はPASS（393x852モバイルビューポートで簡易HTMLを表示可能）。
- ただし、この実行環境ではGitHub非公開リポジトリの正式MAP一式を直接ダウンロードできず、Vercelの現在のPreviewには正式MAP静的ファイルが配置されていない。
- したがって「正式MAPのブラウザー表示・視覚比較・iPhone実機操作」**未検証**。代わりに別デザインのUIを作って正式画面PASSとすることはしない。
- Supabaseアカウントがパスワード認証対応かどうか未確認。実ユーザーの資格情報をChatGPTへ送る必要はない。

## 変更と保全
今回の認証UIコード・本番コード・APIコードの変更なし。検証記録のみ追加。課金・購入・デプロイ・公開なし。

## 次工程
1. 既存正式MAP一式を認証済みでブラウザーがアクセスできるPreview環境に安全に配置・表示する（非公開原本や正式5画面を壊さない）。
2. 既存Supabaseユーザーがアプリ内で認証し、`/auth/v1/user`が受理することを実通信で確認する。
3. Vercel Preview APIとUIの安全な同一オリジン接続を確認。費用の実上限と請求照合前にOpenAI呼び出しを有効化しない。
