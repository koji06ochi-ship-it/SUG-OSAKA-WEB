# S.u.G WALK ミニゲーム 組み込み説明書

制作：ぬくもWeb　／　対象：iPhoneアプリ「S.u.G WALK」にWebViewで組み込むミニゲーム3本

---

## 1. 中身

```
sug-minigames/
├─ index.html          ← 確認用の一覧ページ（アプリには入れなくてOK）
├─ common/sug-common.js ← 3本で共通のしくみ（画面・音・結果の送信など）
├─ img/                ← 公式画像を入れる場所（README.txt を見てください）
├─ boat/index.html     ← ① ピンクマン「ゆらゆら水上観光船」
├─ rhythm/index.html   ← ② PiPi「リズムステージ」
└─ karate/index.html   ← ③ AOTO「空手チャレンジ」
```

- HTML・CSS・JavaScript だけで作っています（外部のライブラリや通信は使っていません。ネットがなくても動きます）
- 画像は、仮のキャラクターも含めて **すべてコードで描いています**。曲（②）も **コードでその場で作っている** ので、音源ファイルはありません。外部の素材のライセンスを気にする必要はありません
- フォントは端末に入っているものを使います

---

## 2. アプリへの組み込み（WKWebView）

`sug-minigames` フォルダをそのままアプリに入れて、各ゲームの `index.html` を開きます。

```swift
import WebKit

class GameViewController: UIViewController, WKScriptMessageHandler {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "sugGame")        // ← 結果を受け取る名前
        config.allowsInlineMediaPlayback = true
        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never     // 画面いっぱいに表示
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(webView)

        // フォルダごとアプリに入れた場合（難易度を決めるときは ?level=easy / normal / hard）
        let root = Bundle.main.resourceURL!.appendingPathComponent("sug-minigames")
        var comps = URLComponents(url: root.appendingPathComponent("boat/index.html"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "level", value: "normal")]
        webView.loadFileURL(comps.url!, allowingReadAccessTo: root)
    }

    // ゲームが終わったときに呼ばれる
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let gameId = body["gameId"] as? String,
              let score  = body["score"]  as? Int,
              let result = body["result"] as? String,      // "clear" または "fail"
              let level  = body["level"]  as? String       // "easy" / "normal" / "hard"
        else { return }
        // ここでコインの計算・付与をしてください（アプリ側）
    }
}
```

> `loadFileURL` の第2引数には、`sug-minigames` フォルダ全体を渡してください（`common` と `img` を読むため）。

---

## 3. アプリに渡される結果

ゲームが終わると、次のデータを **1回だけ** アプリに送ります。

| 項目 | 内容 | 例 |
|---|---|---|
| `gameId` | ゲームの名前 | `"sug-01-boat"` / `"sug-02-rhythm"` / `"sug-03-karate"` |
| `score` | 得点（整数） | `3250` |
| `result` | `"clear"`（クリア）／`"fail"`（失敗） | `"clear"` |
| `level` | 遊んだ難易度 | `"easy"` / `"normal"` / `"hard"` |

- 受け取り口の名前（`sugGame`）を変えたいときは、各ゲームの `config` に `messageHandler: "好きな名前"` を足してください
- Android の WebView でも動くように、`window.ReactNativeWebView.postMessage`（文字列のJSON）と `window.parent.postMessage`（iframe用）にも送る作りにしています
- ブラウザで動かしたときは、結果が開発者コンソール（`[result]`）に出ます

---

## 4. 難易度

3段階（かんたん・ふつう・むずかしい）です。

- 遊ぶ人がスタート画面で選べます（最後に選んだものを覚えています）
- アプリ側で決めたいときは、URLの最後に `?level=easy`（`normal` / `hard`）を付けてください。スタート画面でもその難易度が選ばれた状態になります
- クリアに必要な点数や、ゲームのむずかしさの数字は、各 `index.html` の `levels` にまとまっています

---

## 5. 公式画像の差しかえ

`img` フォルダに、次の名前で **背景が透明なPNG** を置くだけで、仮の絵のかわりに使われます（コードの書きかえは不要です）。ファイルが無いものは仮の絵で動きます。

| ファイル名 | 内容 | 使われるゲーム |
|---|---|---|
| `pinkman.png` | ピンクマン（ふつうの姿） | ①②③ |
| `pinkman_cheer.png` | ピンクマン（うれしい・ガッツポーズ） ※なくてもOK | ①②③ |
| `pinkman_surprised.png` | ピンクマン（びっくり・ずっこけ） ※なくてもOK | ①③ |
| `pinkman_wet.png` | ピンクマン（川に落ちて海藻をかぶった） ※なくてもOK | ① |
| `pinkman_sad.png` | ピンクマン（痛がる） ※なくてもOK（なければ surprised を使う） | ①③ |
| `aoto.png` | AOTO（ふだんの姿・右向き） ※なくてもOK（突きのかまえで代用） | ③ |
| `aoto_punch.png` | AOTO（正拳突き・右向き） | ③ |
| `aoto_hurt.png` | AOTO（やられた） | ③ |
| `pipi.png` | PiPi（立ち姿） | ② |
| `pipi_dance.png` | PiPi（踊っている） | ② |
| `pipi_sing.png` | PiPi（マイクで歌っている） | ② |
| `ship.png` | 船（横向き） ※なくてもOK | ① |

- 足もとが画像の下の中央になるようにしてください。大きさは自由です（縦横比を保って自動で拡大・縮小します）。いまは、いただいた画像（ピンクマン4枚・AOTO2枚・PiPi3枚）が入っています
- 画像を使うと、ピンクマンの腕の動きなど「描いた絵ならではの動き」は、画像全体を動かす・傾ける形になります
- ピンクマンの演出（海藻をかぶる、ムキムキ、髪が生える など）は、画像が増えた段階で別途ご相談ください

### 船を変える（①）
`boat/index.html` の先頭にある `SHIP` を書きかえます。

```js
const SHIP = {
  name: "水上観光船",        // 船体に出る名前
  color: "#ffffff",          // 船体の色
  accent: "#2b7bd6",         // ライン・屋根・文字の色
  image: "../img/ship.png"   // 船の画像（あれば、コードの船のかわりに使う）
};
```

---

## 6. 遊び方のまとめ

| ゲーム | 操作 | 終わり |
|---|---|---|
| ① 水上観光船 | 傾いている反対側の画面をタップしてバランスをとり、たこ焼きをキャッチ（赤い「辛」はよける） | 45秒たえる／3回落ちると失敗 |
| ② リズムステージ | 3レーンのマークが線に重なった瞬間にタップ | 曲の最後（約46秒） |
| ③ 空手チャレンジ | 鬼が来た側をタップして突き（PERFECTで気合ゲージ→真ん中の「気合砲」ボタンで一掃）／通りがかるピンクマンはなぐらない → 最後は連打で瓦割り | 40秒＋瓦割り／3回やられると失敗 |

どのゲームも、途中で一度、ピンクマンが乱入します（タイミングはランダム。乱入中はタイマーが止まります）。

---

## 7. 動作確認の状況

- パソコンのブラウザで、iPhone サイズ（縦画面）に設定して、3本とも最後まで遊べることを確認しています
- **実機のiPhone（Safari / WKWebView）での確認は、これからです。** 組み込み後に気になる点があれば、お知らせください（不具合は、納品後2週間以内なら無料で修正します）
- 音は、iPhone の仕組みで **最初のタップ（スタートボタン）のあと** から鳴ります。マナーモードの場合は鳴らないことがあります

---

## 8. 含まれないもの

ランキングの保存、複数ステージ、オンライン対戦、コインの計算・付与（アプリ側）、細かいアニメーション

---

制作：ぬくもWeb
