# S.u.G WALK R7｜既存Supabaseユーザーログイン入口 実装・検証記録
2026-11-23 JST / Branch: `walk-r7-special-integration-20261123`

## 目的
正式5画面構成・3D MAP・既存BODY・無料の定型観光案内を維持し、MAP→観光案内/通訳のパネルに既存Supabaseユーザーの認証を追加する。
本工程はログイン機能であり、有料AI観光案内の有効化ではない。

## GitHubで行った変更
- 新規 `walk-r7-preview/auth-session.js`: 既存Supabase `nnqzxcgkqjnmtzcvorha` の /auth/v1/token?grant_type=password を使用。ログイン成功後 /auth/v1/user を照合する。
- 公開用 publishable key をBODYエンジンの既存実装から再利用した。service_roleやDBパスワードではない。秘密情報の出力なし。
- セッション: JSメモリ内だけで保持、リロード時消去。refresh tokenは保存しない。トークンは有効期限の15秒前に破棄する。明示的ログアウトで破棄。
- `walk-r7-preview/ai-chat.js`: 観光案内パネルにメール・パスワードの既存アカウント認証表示、失敗時表示、ログアウトを追加。パスワードは送信前に入力欄から消去。新規登録・招待メール・課金処理なし。
- `walk-r7-preview/map.html`: `auth-session.js` を `ai-chat.js` より前に読み込む。
- 既存の自由文AI送信ボタンは `cfg.enabled && cfg.serverHardCapConfirmed` のゲートを維持し、既定で無効。
- 既存の正式5画面、MAP、3D、GPS、SPECIAL、外注ゲーム、BODYには仕様変更なし。

## 実行した検証
GitHubに保存された実ファイルを再取得して構文・読み込み順・無課金ゲートを確認。
JavaScriptの隔離モックで以下 **13/13 PASS**：
1. 初期未ログイン
2. 不正メールの通信前拒否
3. 既存ユーザーを模した認証成功
4. 認証先が既存Supabase /auth/v1/ のみ
5. localStorage/sessionStorage/indexedDB/cookieを使用しない
6. メモリのアクセストークン取得
7. パスワードをSupabaseの認証リクエスト以外へ送らない
8. トークン有効期限による破棄
9. ログアウト時のトークン破棄
10. ユーザー検証失敗時のログアウト
11. パスワード不一致時のログアウト
12. 既存観光案内パネルへの認証UIマウント
13. 有料AI送信ボタンは無効維持

## 未完了・制約
- **実アカウントでのSupabaseパスワードログイン、iPhone/Safari実画面操作、画面レイアウトは未検証**。モックでのPASSは実ログインを意味しない。
- Supabase上の既存アカウントがパスワード方式を利用できるか不明。OAuthまたはOTPのみのユーザーにはこのログイン方式は未対応。
- Preview認証API `api/walk-ai.mjs` は別のprivate GitHub `sug-private-engine` にのみデプロイされている。Vercel SSO保護下のPreviewをGitHub Pages画面から直接呼べることは未確認。ユーザーの実セッションをPreview APIへPOSTした成功結果はない。
- ユーザーのパスワード、トークン、メールアドレスをChatGPTへ送らない。資格情報は本人がアプリUI内で入力する。
- DBの実接続、費用上限強制停止・上流請求照合、AI回答、iOS TestFlight実機は未検証。
- 新規ユーザー作成、メール発信、課金、有料プラン変更、本番変更、デプロイ、既存原本上書きは実施していない。

## 次工程
- HTML Preview内で実画面を確認し、既存ユーザー自身による認証操作で /auth/v1/user 成功か検証（資格情報の共有不要）。
- Preview内のWALK UIとVercel保護済みAPIの同一オリジンまたは認証済み安全接続を設計して、実ユーザーPOSTを検証する。
- 有料AI/LIVEは費用上限の実証・承認までOFF。

## 追補：ログイン画面の操作模擬と競合修正（2026-11-23）
- 作業対象：`walk-r7-preview/auth-session.js`、既存の`ai-chat.js`。正式MAP/他の5画面/BODY/本番デプロイは変更なし。
- GitHubの実ファイルを再取得してDOM模擬操作。ログイン欄とボタンの存在、模擬ログイン成功の表示、パスワード入力欄の消去、ログアウト表示、AI送信ボタンのdisabled維持を確認。
- 発見した競合：ログイン要求の途中でログアウトしても、遅れて到着した認証応答がセッションを復活させ得た。
- 修正：認証世代カウンター`authGeneration`を追加し、ログアウトや後続ログイン後に届いた古い認証応答を`SESSION_CANCELLED`として破棄。古い失敗要求が新しいログインを消さないようにした。
- 修正コミット：`c726693e86bb1223a562409c7e268e17cad70fb4`、`1e255312a82521f254b10846cf50a51f14a98d00`。
- GitHubの修正済み実ソースを再取得して競合テスト：ログアウト中の認証遅延破棄PASS、複数ログインの古い応答の破棄と新しいセッション維持PASS。
- **これはDOM/HTTPモック検証。実iPhone・実ブラウザー描画・実Supabaseユーザーのログイン成功ではない。** ブラウザー連携ツールは元ブラウザーのコンテキストが必要で利用できず、作業コンテナから公開PreviewへのDNS解決もできなかった。したがって実画面PASSは付けない。
- APIは有料AI OFF、Vercel Previewは認証保護を維持。本番公開、AI課金、DB変更なし。
