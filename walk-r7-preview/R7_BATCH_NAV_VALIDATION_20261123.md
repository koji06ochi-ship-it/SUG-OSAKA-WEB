# S.u.G WALK R7｜5画面・AI観光／通訳／LIVE／店舗／動画 一括導線更新記録
更新日：2026-11-23 JST
リポジトリ：koji06ochi-ship-it/SUG-OSAKA-WEB
ブランチ：walk-r7-special-integration-20261123
実装コミット：e16d79cbe89307636aba040880feb184749e211b

## 固定条件
- 正式5画面、HOME/SPECIAL、ピンククマの原本、3D MAPと川・建物・公園の描画コードは維持。
- S.u.G GAMEは外注対象のため、SPECIALの「準備中」を維持。既存旧ゲーム資産は移植しない。
- 有料API、配信サーバー、認証・購入・公開・課金・Codex実行は禁止。ユーザーの明示承認がない限り開始しない。
- AI/LIVE運用予算の過去規定は月額合計10,000円の上限方針であり支出承認ではない。

## 実装
- MAP「🧭 操作」収納メニューに3言語通訳、LIVE配信、観光動画、店舗紹介を追加。
- 観光案内は既存 btn-ai-guide → tour-guide.js の6スポット／3言語案内、8定型文通訳へ接続。
- 3言語通訳は同案内を開き、定型文選択までスクロール／フォーカス。
- 観光動画は既存HOMEの openWater('video') 呼出。接続不可時に案内を表示する。
- 店舗紹介はMAPの既存 list('discover') を利用。登録済み一覧がなければ「掲載する確認済み店舗はありません」。
- LIVE配信はサービス未接続の安全な案内画面。カメラ・マイク・通信起動なし。
- 実AI自由会話・自由文翻訳は無効のまま。既存のAIサーバー予算ガードを維持。
- 3D・GPS・検索・徒歩ルート・八軒家浜・NEON/SPECIAL導線は変更しない。

## 静的検証
- map.htmlのインラインJavaScript 8本の構文検査 PASS。
- index.htmlのインラインJavaScript 1本の構文検査 PASS。
- tour-guide.js、ai-chat.js、special.htmlのインラインJS2本、special-bridge.jsの構文検査 PASS。
- 新規4ボタン・既存7主要ボタン／ズームボタンのID重複なし（各1件）。
- 新規4ボタンのclickハンドラ定義を検査。
- 3D切替ID、旧SPECIALブリッジ、オフラインAI費用ガード保持を検査。
- GitHubから更新後コードを再取得し、ブロブSHAを確認。

## 未検証・残課題
- iPhone実機で4新規ボタンのタップ／表示／戻るを未検証。表示PASSとは報告しない。
- HOME側の動画UI起動・動画の再生素材・外部URL・配信データは未検証、実動画素材の投入なし。
- 店舗掲載データの存在と登録権限未検証。架空店舗は登録しない。
- 動的AI翻訳・自由会話・LIVE配信・外部課金は未接続、実運用は不可。
- GPSの実精度、配信・観光時刻表の正確性は未検証。
- 変更は作業ブランチのみ。mainへの統合、本番公開なし。

## リビジョン
- 変更対象：walk-r7-preview/map.htmlのみ。
- 前回MAP BLOB SHA: ac1f7c1427ce239e7bc61f45c7437d2f6f6bc24d
- 今回MAP BLOB SHA: 6c42181eb16d088e61e7ddd6c713c02d2ed72e27


## 追補：HOME 3導線の統一（2026-11-23）
- 実装コミット：da975230b487612671dd81eaabbee51937815058
- 対象：walk-r7-preview/home.html。ほかの正式画面は変更なし。
- HOMEのAI観光／AI通訳／LIVEの3カードからMAPへ切り替えた後、既存ボタンのclickを実行する。
  - AI観光→btn-ai-guide（登録済み6スポット／3言語）。
  - AI通訳→btn-r7-translate（事前翻訳8定型文／3言語）。
  - LIVE→btn-r7-live（配信バックエンド未接続、状態説明のみ）。
- MAP未準備時にはiframe load後に実行するフォールバックを追加。その他のHOMEカードは既存動作維持。
- コード検証：HOMEインラインJS 2本構文PASS、MAPに対象3 IDあり、正式5タブ配列あり、旧HOME動画openWaterあり。
- 未検証：iPhoneでHOMEから3導線のタップ操作、MAP iframe表示後に自動開閉する挙動。自動検証環境は現時点で利用可能と確認できていない。
- 絶対条件：有料サービス／LIVE／動的AIは起動・契約・課金なし。
