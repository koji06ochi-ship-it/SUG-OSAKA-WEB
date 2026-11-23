# S.u.G WALK R7｜観光動画・店舗紹介 接続準備と検証（2026-11-23）

## 変更対象
- `walk-r7-preview/tourism-media.js` 新規（動画素材の承認制マニフェスト）
- `walk-r7-preview/home.html` 既存5章動画画面に実MP4再生枠を接続
- `walk-r7-preview/map.html` 店舗一覧で情報確認日と営業情報の注意を表示
- ブランチ：`walk-r7-special-integration-20261123`。main未変更。

## 動画仕様・重要事項
- 5章の章立て、JA/EN/ZH UI、PR明示、初期遠景演出OFF、君に。エンディングの遠景禁止、購入未接続を維持。
- 実素材は現時点でゼロ件。UIには「動画未登録」と表示し、架空の再生成功を出さない。
- `tourism-media.js` の `approved` オブジェクトに、使用許可と出所が確認できたローカルMP4だけを `{src:'./media/file.mp4',approved:true,captionsReady:{ja:true}}` の形で登録可能な設計。
- 対象パスは厳格に `./media/[A-Za-z0-9_-]+.mp4` とし外部URL、未承認ソースは拒否。
- 実登録済みならHTML5 video `controls playsinline preload=none` で明示タップ再生。現在は素材不足のため再生実試験は不可。
- 字幕設定・字幕言語選択のUIは既存仕様保持。実字幕ファイル読み込みは未実装（登録フラグは補助情報で字幕同期を保証しない）。

## 店舗仕様
- 既存の掲載判定 `approved=true`, `category=shop`, 有効な緯度経度、HTTPS情報源、90日以内の確認日と期限チェックを再利用。架空登録なし。
- 「おすすめ店舗」を「掲載確認済みの店舗」に変更。検証日（verifiedAt）を表示し、営業状況の公式確認を促す。
- 現在の `SUG_WALK_VERIFIED_PLACES` は空配列。実掲載データは0件。出典・許可未確認の候補を自動登録しない。
- 店舗登録管理／外部店舗APIは未接続。掲載料の徴収・課金も未接続。

## 静的検証（今回実施）
- home.html のインラインJavaScript 2本構文PASS。
- map.html のインラインJavaScript 8本構文PASS。
- index.html のインラインJavaScript 1本構文PASS。
- tourism-media.js と special-bridge.js 構文PASS。
- 5章存在、動画マニフェスト読込、ネイティブvideoプレーヤー、autoplay無し、承認必須、掲載確認日表示・店舗フィルター保持、3D切替ボタン、SPECIAL・正式5タブ・GAME準備中をコード照合。
- iPhone実機で動画画面・店舗一覧をタップした証拠は今回未取得。
- 動画素材の取得・再生、字幕同期、店舗実データの表示、外部LIVE/AI APIは未検証・未接続。

## 変更コミット
- 85db5d99d93c99f756bd5a247626bf1807c6a380 — マニフェスト
- 48a3a29641c593c0d22832a8b1223607b8e18278 — HOME再生UI
- 6967986f730ae21994238caa011b3af278c0e61b — 店舗一覧

## 残課題
1. 公式／クリエイター動画原本・利用許可・言語別字幕・広告主許可の受領と検証
2. 実MP4の所定パス追加、承認済みマニフェスト登録、iPhone Safariで再生テスト
3. 店舗原資料・許可・確認日・座標・掲載条件を受領し掲載データを投入
4. iPhoneでHOME→観光動画、MAP→店舗の実表示確認
5. 配信サーバー、AI有料API、購入、公開は承認前に開始しない
