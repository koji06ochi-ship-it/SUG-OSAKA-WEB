# S.u.G WALK R7｜MAP既存ユーザー認証UI 検証記録
日付：2026-11-23 JST
対象：既存正式5画面②MAP → 観光案内・通訳 → 既存Supabase認証
作業ブランチ：`walk-r7-special-integration-20261123`

## 今回の作業
1. 既存GitHub現物の `auth-session.js`、`ai-chat.js`、`map.html` を直接再取得して再評価。
2. Chromiumの実行ファイルとPlaywrightの存在を作業環境で確認。
3. GitHub Previewの静的URL（raw.githack.com）にアクセスを試みるもDNS解決不可 `Could not resolve host: raw.githack.com`。この環境から正式MAP全体の実画面レンダリングはできていない。
4. 使用可能な実行環境で、再取得した**実ソース**をJavaScriptの模擬DOMに注入し、ログイン操作・ログアウト・セッション期限及びAI課金停止のうち16条件をテスト。
5. 本番や既存BODYへの変更なし。有料API呼び出しなし。実アカウント・個人情報・ログイントークンは不使用。

## 再取得した検証時のファイルblob SHA
- `walk-r7-preview/auth-session.js`: `6e7a49fc598cf58246d0071d5505de9d678eda94`
- `walk-r7-preview/ai-chat.js`: `faa336c2d269b7d52d5d1e30f72ecbab2eedcd19`
- `walk-r7-preview/map.html`: `ffa82b7c5e356d6a256b3a9fe5d3f7861860dcce`

## 模擬DOMの操作テスト：16/16 PASS
1. ログイン欄がパネルのタイトル直後に挿入される
2. 2入力欄＋2ボタンを生成
3. メール入力欄は `type=email`
4. パスワード入力欄は `type=password`
5. 初期表示は未認証
6. 初期のAI送信ボタンは無効
7. ボタン操作で模擬認証成功メッセージ
8. 認証後にパスワード入力欄を消去
9. 模擬Supabase認証はパスワード認証＋`/auth/v1/user`の2通信
10. 認証に成功しても有料AI送信は無効
11. ログアウトで未認証メッセージ
12. ログアウトでトークンを破棄
13. 誤認証で失敗メッセージ
14. 認証失敗後は未ログイン状態
15. ログアウトと並行していた遅延認証の完了がセッションを復活させない
16. MAPで `auth-session.js` を `ai-chat.js` より先に読み込む

**注意：これは模擬DOM・模擬ネットワークのテストであり、Chromium実画面PASSではない。**

## 現時点の検証済み・未検証
- **検証済み：** 先行のVercel Preview API `GET /api/walk-ai` → HTTP 200、`GET /api/walk-ai?authProbe=1` → HTTP 200、Supabase無効トークン拒否。今回16/16模擬UI操作成功。
- **未検証：** 正式R7 MAPのChromium画面表示、iPhone Safariでの認証画面、実メール・パスワードによるSupabaseセッション、ログイン済みでVercel POST、AI回答、実DB費用上限停止、テストフライト。
- 認証UIは既存WALKのGitHub作業ブランチには組込済みだが、本番反映は行っていない。ログインできるユーザーには既存Supabase認証方式が必要であり、パスワードログイン対応状況は未確認。
- Preview APIはVercel SSOで保護されている。アプリ画面から直接呼ぶには別途認可設計が必要。
- **追加課金・本番公開・既存原本への上書きは行っていない。**

## 次工程
- 実画面検証のため、権限のあるブラウザーで既存GitHub作業ブランチのR7 HTMLを読み込む。Chromiumがローカル実行できてもソースを取得できない環境では全画面PASSにしない。
- 既存Supabaseユーザー本人がUIに認証情報を入力して操作確認（チャットへパスワードを渡さない）。
- 実認証結果を踏まえ、保護済みPreview APIとの安全な接続方式を確認。料金実停止までAI/LIVEはOFF。
