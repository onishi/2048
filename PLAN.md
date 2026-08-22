# 開発計画（PLAN）

本ドキュメントは `SPEC.md` の 19 章（開発フェーズ）を基に、各フェーズを実装可能な単位のタスクへ分解したものである。各タスクの後ろの `SPEC.md #n` は、対応する仕様の参照章を示す。

各タスクはチェックボックスになっている。実装が完了したタスクは `- [x]` にチェックを入れること。

進め方の原則:

- フェーズは基本的に上から順に進める。Phase 1〜5 が MVP（最初のリリース）であり、`SPEC.md #19.1` の実装順序と一致する。
- 各フェーズは「そのフェーズの完了条件」を満たした時点で完了とし、次フェーズへ進む。ただし Phase 6 以降は MVP 公開後の拡張であり、優先度に応じて入れ替え可能。
- Phase 1〜6・10 は Web（TypeScript）、Phase 7〜8 は Python 研究環境、Phase 9 は両者の橋渡し（ONNX）である。

## フェーズ一覧

| Phase | 内容 | 完了条件（SPEC.md #19） |
|---|---|---|
| 1 | ゲーム本体 | 普通の 2048 として Web ブラウザで遊べる |
| 2 | 基本 AI | AI が自動でゲーム終了までプレイできる |
| 3 | Expectimax | Expectimax が 2048 を一定確率で作れる |
| 4 | Web Worker | AI 探索中も UI 操作やアニメーションが停止しない |
| 5 | Cloudflare 公開 | 公開 URL から 2048 AI を利用できる |
| 6 | AI Visualization | AI がなぜその手を選んだかある程度見える |
| 7 | Python 研究環境 | ローカルで大量ベンチマークとデータ生成ができる |
| 8 | Neural AI | 教師データからモデルを学習し ONNX へ変換できる |
| 9 | Browser Neural AI | 探索なしで 2048 をプレイできる |
| 10 | AI Comparison | 複数 AI を同一画面で比較できる |

---

## Phase 1: ゲーム本体

**目的**: AI やインフラに触れる前に、独立してテスト可能なゲームエンジンと最低限の UI を確立する。

### タスク

- [x] **プロジェクト初期化**
  - `package.json` / `tsconfig.json` / `vite.config.ts` / Vitest 設定を作成する（`SPEC.md #6.1`）
  - `web/` 配下のディレクトリ構成を `SPEC.md #7` の通りに用意する
- [x] **型定義** — `web/src/game/types.ts`
  - `Board`, `Direction`, `GameState`, `MoveResult` を定義する（`SPEC.md #9`）
- [x] **乱数生成器** — `web/src/game/rng.ts`
  - seed 可能な `Rng` インターフェースと実装（例: mulberry32 等の軽量 PRNG）を用意する（`SPEC.md #10.4`）。Phase 1 の時点ではゲーム内で使うのみだが、後の Replay 機能（`SPEC.md #15.1`）のために最初から `Rng` を経由してタイル生成する設計にしておく
- [x] **盤面ユーティリティ** — `web/src/game/board.ts`
  - `getEmptyCells`, `getMaxTile`, 盤面の clone / serialize ヘルパーを実装する
- [x] **移動・マージロジック** — `web/src/game/move.ts`
  - `move(board, direction): MoveResult` を実装する（`SPEC.md #10.2`）
  - 実装方針: 4 方向すべてを個別実装せず、盤面の回転・転置を用いて「LEFT への move」1 種類に帰着させると実装・テストが単純になる
  - No Double Merge（同ターン内で生成されたタイルは再結合しない）を必ず守る
- [x] **ゲーム進行** — `web/src/game/game.ts`
  - `spawnRandomTile(board, rng)`, `getValidMoves(board)`, `isGameOver(board)` を実装する
  - `GameState` の初期化・`move` 適用・スコア加算・`moveCount` 更新をまとめた `applyMove(state, direction, rng)` 相当の関数を用意する
- [x] **ゲームロジックのテスト**
  - `SPEC.md #10.3` の全テストケース（基本マージ／2組同時マージ／異なる値の2組同時マージ／No Double Merge）を実装する
  - `SPEC.md #10.5` の Game Over 判定テストを実装する
  - ランダムタイル生成の 2:4 = 90%:10% 比率を、大量試行の統計テストで確認する
- [x] **UI（最小限）**
  - `web/index.html`, `web/src/main.ts`, `web/src/app.ts`
  - `web/src/ui/board-view.ts`: 盤面描画（グリッド、タイル色分け、スコア表示）
  - `web/src/ui/controls.ts`: キーボード操作（矢印キー）とスワイプ操作（タッチイベント）
  - 最低限の CSS（レイアウト崩れがない程度）
- [x] **手動確認**
  - `npm run dev` で起動し、キーボードとスワイプ両方で問題なくプレイできることを確認する
  - Game Over 表示、Reset 動作を確認する

### 完了条件
普通の 2048 として Web ブラウザで遊べる（`SPEC.md #69` の MVP 画面相当）。

---

## Phase 2: 基本 AI

**目的**: AI の共通インターフェースと評価関数を確立し、探索なしの AI（Random / Greedy）で全体の配線を通す。

### タスク

- [x] **Player インターフェース** — `web/src/ai/player.ts`
  - `interface Player { chooseMove(board: Board): Promise<Direction> }`（`SPEC.md #11.1`）
- [x] **Random AI** — `web/src/ai/random-player.ts`（`SPEC.md #11.3`）
- [x] **評価関数** — `web/src/ai/evaluator.ts`, `web/src/ai/weights.ts`
  - `SPEC.md #12` の各項目を個別関数として実装する: `emptyScore`, `monotonicityScore`, `smoothnessPenalty`, `mergePotentialScore`, `cornerBonus`, `snakeScore`
  - `evaluate(board, weights)` で `SPEC.md #12.1` の符号規約（Smoothness のみ減算）に従って合成する
  - `DEFAULT_WEIGHTS`（`SPEC.md #12.8`）を初期値として設定する
  - 各評価項目について、既知の盤面に対する期待値を用いた単体テストを書く
- [x] **Greedy AI** — `web/src/ai/greedy-player.ts`
  - 1手先の `getValidMoves` を評価し、最大評価値の手を返す（`SPEC.md #11.4`）
- [x] **UI 統合**
  - AI 選択 UI（Random / Greedy の切り替え）
  - 「AI Move」ボタン: 現在の盤面に対する提案手を1つ表示する（`SPEC.md #8.2` の表示イメージ）
  - Auto Play の骨組み（Start / Pause / Reset）。この時点ではメインスレッドで実行してよい（Worker 化は Phase 4）
- [x] **テスト**
  - Random AI が常に有効な手のみ選ぶことを確認するテスト
  - Greedy AI が単純な局面で「明らかに良い手」を選ぶことを確認するテスト

### 完了条件
AI が自動でゲーム終了までプレイできる。

---

## Phase 3: Expectimax

**目的**: 本サービスの初期メイン AI を実装し、ベンチマークで性能基準（2048 到達率 50% 以上）を満たすことを確認する。

### タスク

- [x] **Expectimax 実装** — `web/src/ai/expectimax-player.ts`
  - `SPEC.md #11.5` のアルゴリズムをそのまま実装する。特に **depth は CHANCE→MAX 遷移時のみ消費する**（元設計のバグ修正版であることに注意し、実装時に取り違えないこと）
  - MAX ノード: 全 `getValidMoves` を展開し最大値を返す
  - CHANCE ノード: 空きマスごとに 2(90%) / 4(10%) を仮置きして期待値を計算する
- [x] **キャッシュ** — `SPEC.md #11.8`
  - `Map<string, number>` によるメモ化（キー: `board.join(",")+depth+nodeType`）
  - 1回の `chooseMove` 呼び出しごとにキャッシュをクリアする
- [x] **深度設定 UI**
  - Depth 2〜6 の選択 UI（デフォルト 4、`SPEC.md #11.6`）
- [ ] **Dynamic Depth（任意）**
  - 空きマス数に応じた深度テーブル（`SPEC.md #11.6`）を適用するオプションを実装する
  - 見送り: Chance Sampling のみで実用的な速度が確保できたため未実装。必要になれば着手する
- [x] **Chance Sampling（任意、性能問題が出た場合に着手）**
  - 空きマスが多い局面で展開セルをサンプリングする（`SPEC.md #11.7`）
  - 実測で mid-game の盤面(空きマス10)が depth4 で3秒超・depth5で46秒超かかることを確認したため実装。空きマス6超で均等間隔サンプリングし、depth4を1桁秒未満に短縮した
- [x] **探索統計の収集**
  - `nodes`（展開ノード数）と `elapsedMs`（経過時間）を計測するロジックを追加する。これは Phase 4 の `AIResponse`（`SPEC.md #13.1`）と Phase 6 の可視化にそのまま使う
- [x] **テスト**
  - 既知の簡単な局面で Expectimax が直感的に正しい手を返すことを確認するテスト
  - キャッシュの有無で返す手・評価値が変わらないことを確認するテスト（キャッシュの正当性検証）
  - Depth を上げるほど（同一局面で）評価値や選択手が安定する傾向を確認するテスト
- [x] **ベンチマーク（簡易）**
  - この時点ではまだ Web Worker 化されていないため、Node.js 上（Vitest や簡易スクリプト）で複数ゲームを自動実行し、2048 到達率を計測する

### 完了条件
Expectimax が 2048 を一定確率で作れる（`SPEC.md #20` の成功基準: 2048 到達率 50% 以上を目安に確認する）。

---

## Phase 4: Web Worker

**目的**: AI 探索をメインスレッドから切り離し、UI が探索中もブロックされないようにする。

### タスク

- [x] **通信プロトコル** — `web/src/worker/protocol.ts`
  - `AIRequest` / `AIResponse` を定義する（`SPEC.md #13.1`）
- [x] **Worker 本体** — `web/src/worker/ai-worker.ts`
  - `AIRequest` を受け取り、Phase 3 の Expectimax + Evaluator + Cache を実行して `AIResponse` を返す
- [x] **Worker クライアント（メインスレッド側）**
  - `Player` インターフェースを Worker 越しに実装するアダプタを用意する（例: `web/src/ai/worker-expectimax-player.ts`）
  - Worker の生成・破棄・メッセージング（`postMessage` / `onmessage`）をラップする
- [x] **AI キャンセル** — `SPEC.md #13.2`
  - 各リクエストに `requestId` を付与する
  - 最新リクエスト以外のレスポンスは破棄する
  - Reset / Pause / New Game 押下時に、必要であれば Worker を `terminate` して再生成する
- [x] **UI 連携**
  - 探索中でも盤面操作・アニメーション・他の UI 操作がブロックされないことを手動確認する
  - Auto Play / AI Move を Worker 経由に切り替える
- [x] **テスト**
  - Worker Test（`SPEC.md #18`）: `board` を送信 → Worker が探索 → 有効な `Direction` が返ることを確認する
  - キャンセル: 短時間に複数リクエストを送った場合、最新のレスポンスのみが UI に反映されることを確認する

### 完了条件
AI 探索中も UI 操作やアニメーションが停止しない。

---

## Phase 5: Cloudflare 公開

**目的**: MVP を実際に公開 URL でアクセス可能にする。

### タスク

- [x] **Wrangler 設定**
  - `wrangler.jsonc` を作成し、Static Assets 配信を設定する（`SPEC.md #5`）
  - D1 / R2 はこの時点では使用しない
- [x] **ビルド確認**
  - `vite build` の出力を Cloudflare Static Assets が期待する形に配置する
- [ ] **デプロイフロー**
  - `wrangler dev` によるローカルでの Cloudflare 実行環境エミュレーションでは、Static Assets 配信・Web Worker (Expectimax) とも正常動作を確認済み
  - `wrangler deploy` による実際の公開は **未実施**（Cloudflare アカウントの認証情報がこの環境にないため）。ユーザー側で `npx wrangler login` の上 `npm run deploy` を実行するか、`CLOUDFLARE_API_TOKEN` を渡してもらう必要がある
  - 可能であれば GitHub Actions 等での自動デプロイを検討する（必須ではない）
- [ ] **本番スモークテスト**
  - 公開 URL 上で Play / AI Move / Auto Play が問題なく動作することを確認する（`SPEC.md #14.5` の対応ブラウザを一通り確認）
  - デプロイフローが未実施のため未着手
- [x] **README 更新**
  - セットアップ手順・デプロイ手順を `README.md` に記載する

### 完了条件
公開 URL から 2048 AI を利用できる。
**未達成**: ビルド・Wrangler 設定・ローカルでの Cloudflare 実行環境エミュレーションまでは完了しているが、実際の公開デプロイには Cloudflare アカウントの認証情報が必要なため保留中。

---

## Phase 6: AI Visualization

**目的**: 「AI がどう考えているか見える」という本サービスの差別化要素を実装する。

### タスク

- [x] **Action Values 表示** — `web/src/ui/stats.ts`
  - 各方向（UP/DOWN/LEFT/RIGHT）の評価値と、選択された手のハイライトを表示する（`SPEC.md #14.2`）
- [x] **探索統計表示**
  - Depth / Search Nodes / Elapsed Time / Cache Hits を表示する。`AIResponse` にキャッシュヒット数を追加する
- [x] **Evaluator Breakdown**
  - `evaluate()` を、合計値だけでなく各項目（empty / monotonicity / smoothness / merge / corner / snake）のスコア内訳も返せるように拡張する
  - UI 上で内訳を確認できるようにする
- [x] **Auto Play 速度設定**
  - Slow / Normal / Fast / Maximum を実装する（`SPEC.md #14.3`）。現状 UI にタイル移動アニメーション自体がない（即時再描画）ため、Maximum での「アニメーション省略」は該当なし
- [x] **Web 版簡易 Benchmark**
  - 「Run N Games」の簡易ベンチマーク UI を実装した(`SPEC.md #14.4`)。大量実行はローカル Python 環境(Phase 7)を推奨する旨をコード内コメントに記載

### 完了条件
AI がなぜその手を選んだかある程度見える。

---

## Phase 7: Python 研究環境

**目的**: 大量ベンチマークとデータセット生成をローカルで行えるようにする。TypeScript 版とロジックを一致させることが最重要。

### タスク

- [x] **プロジェクト初期化**
  - `research/pyproject.toml`、pytest 設定を用意する（`SPEC.md #6.2`）
- [x] **ゲームロジック移植** — `research/src/game2048/board.py`
  - Phase 1 の TypeScript ロジック（move / merge / spawn / game over）を Python で再実装する
  - TypeScript 版と Python 版で同一の入力に対し同一の出力になることを、共有テストケース（`SPEC.md #10.3` 等）で相互に検証する
- [x] **評価関数移植** — `research/src/game2048/evaluator.py`
  - `SPEC.md #12` の評価関数を Python で再実装する
- [x] **Expectimax 移植** — `research/src/game2048/expectimax.py`
  - Phase 3 のロジックと同一のアルゴリズム（depth 消費の定義を含む）を移植する
- [x] **ベンチマークスクリプト** — `research/scripts/benchmark.py`
  - `SPEC.md #16.1` の CLI 引数（`--games`, `--depth`）と出力フォーマット（Average/Median/Best Score、512〜8192 到達率等）を実装する
  - 記録指標一式（score, move_count, max_tile, 到達率, average move time, total game time, nodes searched, cache hit rate）を出力する
  - 実測: Python は V8 の JIT がない分 Expectimax が低速（depth 2 で 1 ゲーム十数秒〜）。スクリプト冒頭にその旨と `--depth 2〜3` 推奨を明記した
- [x] **パラメータ探索** — `research/scripts/param_search.py`
  - 評価関数の重みを変えながら実行し比較する仕組みを作った（`SPEC.md #16.2`）。Random Search、デフォルトは高速な Greedy AI で評価し `--ai expectimax` でも切り替え可能
- [x] **Dataset 生成スクリプト** — `research/scripts/generate_dataset.py`
  - Expectimax を教師として `SPEC.md #16.3` のレコード形式(board/bestAction/values)で JSON Lines 出力する
- [x] **テスト** — `research/tests/`
  - Python 版ゲームロジック・評価関数・Expectimax・Random/Greedy・スクリプトの単体テスト(50件)
  - TypeScript 版を node で実行した結果を `tests/fixtures/` に固定し、Python 版の出力と完全一致することを確認する回帰テスト(rng/game/evaluator/expectimaxの4種)

### 完了条件
ローカルで大量ベンチマークとデータ生成ができる。

---

## Phase 8: Neural AI（学習）

**目的**: Expectimax を教師とした模倣学習でニューラルネットを学習し、ONNX へ変換する。

### タスク

- [x] **入力表現の実装** — `research/src/game2048/features.py`
  - タイル値を `log2` へ変換する関数を実装する（`SPEC.md #17.2`）
- [x] **モデル定義** — `research/src/game2048/model.py`
  - `SPEC.md #17.3` の MLP（Input 16 → 128 → 128 → 64 → 4）を PyTorch で実装する
- [x] **学習スクリプト** — `research/scripts/train.py`
  - Phase 7 で生成したデータセットを読み込み、Cross Entropy で学習する（`SPEC.md #17.4`）
  - 学習/検証データの分割、簡単な学習曲線のロギングを行う
- [x] **モデル評価**
  - 検証データに対する top-1 accuracy を各エポックでログ出力する
  - `research/src/game2048/neural_player.py`(`NeuralPlayer`)を追加し、`scripts/benchmark.py --ai neural --model-path` で Expectimax 等との到達率比較ができるようにした
- [x] **ONNX 変換** — `research/scripts/export_onnx.py`
  - `model.pt` → `model.onnx` へ変換する（`SPEC.md #17.5`）
  - 変換後モデルを ONNX Runtime（Python）でロードし、PyTorch 版と出力が一致することを確認する(差分 0)

### 完了条件
教師データからモデルを学習し ONNX へ変換できる。

**環境メモ**: このセッションのサンドボックスからは `download.pytorch.org`(CPU専用wheelの配布元)へ到達できず、PyPI既定の `torch` は CUDA ランタイム込みの巨大な wheel を要求する。`torch` 本体は `--no-deps` で導入し、実際には使わない CUDA 共有ライブラリ群(`nvidia-*-cu12`)を import 時の dlopen 用に別途インストールすることで CPU 実行に到達した(GPUは未使用、`torch.cuda.is_available()` は `False`)。通常のマシンでは `pip install torch`(または CPU 専用 index)で問題なく導入できるはずで、これは本環境固有の回避策。詳細は `research/pyproject.toml` の `ml` extra のコメントを参照。

---

## Phase 9: Browser Neural AI

**目的**: 学習済みモデルをブラウザ上で推論できるようにする。

### タスク

- [x] **ONNX Runtime Web 導入**
  - `onnxruntime-web` を依存に追加する
  - `onnxruntime-web`(既定エントリ)は WebGPU/JSEP 込みで wasm が26MB超になるため、`onnxruntime-web/wasm` を使い13MB程度に抑えた
  - Vite の dev サーバーでは `onnxruntime-web` を esbuild の dep pre-bundling に通すと wasm 取得が壊れる(index.htmlが返る)問題があったため、`vite.config.ts` の `optimizeDeps.exclude` に追加して回避した
- [x] **モデル配信**
  - `model.onnx` を `web/public/models/2048-ai.onnx` として配置した（`SPEC.md #17.5`）。Phase 7/8のスクリプトで生成した約7500レコード(depth2, 40ゲーム分)のデータセットで学習したモデル(精度は小規模データセットなりで平凡)
- [x] **Neural Player 実装** — `web/src/model/neural-player.ts`
  - `Player` インターフェースを実装し、盤面 → log2 変換 → ONNX 推論 → `Direction` を返す（`SPEC.md #17.6`）
  - 推論結果が `getValidMoves` に含まれない場合のフォールバック処理（ロジットの高い順に有効な手を探す）を実装した
- [x] **UI 統合**
  - AI 選択肢に Neural を追加した
- [x] **テスト**
  - モデルロード〜推論〜`Direction` 返却までの一連の流れをfakeセッションでテストした
  - Python 側（ONNX Runtime）とブラウザ側（ONNX Runtime Web）で同一入力に対する出力が一致することを確認した(最大誤差 1.9e-6、浮動小数点誤差の範囲内)

### 完了条件
探索なしで 2048 をプレイできる。

---

## Phase 10: AI Comparison

**目的**: Random / Greedy / Expectimax / Neural を横並びで比較できるようにする。

### タスク

- [x] **AI Version 管理** — `web/src/ai/ai-version.ts`
  - `AI_VERSIONS`(`Record<AiType, string>`)で各 AI にバージョン文字列を持たせた（`random-v1` / `greedy-v1` / `expectimax-v1` / `neural-v1`、`SPEC.md #15.3, #61`）
  - `AiType` を `web/src/ai/player-types.ts` に切り出し、`app.ts` / `ai-version.ts` / `comparison.ts` から循環参照なしで共有できるようにした
- [x] **比較 UI** — `web/src/ai/comparison.ts`, `app.ts`
  - `runComparison()` が既存の `runBenchmark()` を再利用し、指定した複数 AI を順番にベンチマークして結果を返す
  - 「Compare All AIs」ボタン(`#comparison-button`)を追加。実行中は比較/ベンチマーク/Auto Play の各ボタンを相互に無効化し、進捗を `AI名: 完了数/総数` で表示する
- [x] **比較結果の記録**
  - `ComparisonEntry`(`{ aiType, version, summary }`)に `AI_VERSIONS` の値を必ず含めて返すようにした
- [x] **可視化** — `web/src/ui/stats.ts` の `renderComparisonResults()`
  - AI / Version / Avg Score / Best Score / Avg Moves / Best Tile を並べたテーブルで表示する
  - ブラウザ実測（Depth 2, 3 games）: Random 524 < Neural 2,448 < Greedy 10,641 < Expectimax 17,856（平均スコア）

### 完了条件
複数 AI を同一画面で比較できる。

---

## 参考: MVP 完了までの実装順序

`SPEC.md #19.1` に基づき、Phase 1〜5 の内部でも以下の順序を意識する。

1. TypeScript で 2048 Game Engine
2. ブラウザ UI
3. Random AI
4. Evaluator
5. Greedy AI
6. Expectimax
7. Web Worker
8. Auto Play
9. AI 評価値表示
10. Cloudflare Deploy

Phase 6 以降（AI Visualization の一部、Python 研究環境、Neural AI、AI Comparison）は MVP リリース後の拡張として着手する。
