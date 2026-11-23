# S.u.G WALK R7｜MAPログインUIの表示経路・操作検証（2026-11-23）

## 今回やること
正式5画面のMAP「観光案内・通訳」パネルから、既存Supabaseユーザーログイン欄を表示できる構成か確認。無料の定型文通訳、3D MAP、BODYおよび有料AI OFFを維持する。

## 調査した現物
- GitHub `koji06ochi-ship-it/SUG-OSAKA-WEB` の `walk-r7-special-integration-20261123` 上の `walk-r7-preview/map.html`、`tour-guide.js`、`ai-chat.js`、`auth-session.js`。
- 画面表示経路：`#btn-ai-guide` → `openModal` → `#sug-tour-guide-root` → `SUGR7TourGuide.open` → `SUGR7AIChat.mount`。
- MODALは `overflow-y: auto` が設定され、長い内容をスクロールする構成。
- 元のAIパネルでは既存ユーザーログイン欄が無効なAI入力欄より後ろに配置されていたため、ログイン欄の発見が遅れる可能性があった。

## 実際に変更したもの
- `walk-r7-preview/ai-chat.js` の認証パネル配置を `panel.append(authBox)` から `panel.insertBefore(authBox, task)` に変更。
- ログインパネルはAI入力の前、無料の定型文観光案内・翻訳セクションの後に表示する。
- コミット `8193b09afb5764e99b769dcbd863268666cdbb91`。
- `map.html`、`tour-guide.js`、`auth-session.js` や既存画面本体は変更しない。

## 自動検証結果
GitHub上の変更後実ファイルを再取得し、実行モックで **10/10 PASS**：
1. 認証JSがAIパネルJSより先にロード
2. 認証欄がAIのタスクセレクタより前
3. メール・パスワード入力2つ
4. パスワード入力は`type=password`
5. ログインボタン存在
6. ログアウトボタン存在
7. 有料AI送信ボタンは無効
8. ブラウザー永続保存領域を使わない
9. MAPモーダルが縦スクロール可能なCSS
10. 2つの認証関連JSの構文確認

## 未検証（重要）
- この実行環境のChromiumは利用可能だが、外部GitHub/RawGitHackへのDNS接続ができない。既存WALKのWeb画面一式を取得して起動する経路がないため、**正式MAPのブラウザー描画・実スクリーンショット・iPhone Safari操作は未検証**。
- 上記10/10は保存されたJSを使うDOMモックであり、実ブラウザー・iPhone実画面のPASSではない。
- 既存Supabaseアカウントの本人によるメール・パスワード実ログイン、Vercel Previewの有効Bearer認証POSTも未検証。パスワードやトークンをチャット/GitHubへ送らない。
- 有料AIはOFF。追加費用、デプロイ、本番公開、既存BODY変更、DB書き込みは未実施。

## 次の具体的な実作業
- Webアクセスできるブラウザー実行環境（WorkのCloud Browser等）でR7 Previewを起動して `MAP → 観光案内 → ログイン` の表示・タップ・スクロールを検査する。
- 実ユーザーは認証情報を自分の画面で入力し、セッション認証のHTTP結果のみを検査する。
- Vercelの保護されたPreview APIに有効セッションをPOSTして、認証成功時でも `503 SERVICE_DISABLED`（有料AI 0件）を確認する。プロバイダ課金は費用上限の強制停止が実証されるまでOFF。
