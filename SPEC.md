# Web版 2048 AI 設計書

## 1. 目的

2048 を自動プレイする AI を、Web ブラウザ上で動作するサービスとして実装する。

- サービス本体は Cloudflare 上で配信する。
- 2048 のゲームロジックと AI 推論は、原則としてユーザーのブラウザ内で実行する。
- 初期バージョンではニューラルネットワークを使わず、TypeScript による Expectimax 探索と評価関数で AI を実装する。
- その後、ローカル環境で Expectimax AI を用いて教師データを生成し、小型ニューラルネットワークを学習させ、ONNX 形式のモデルをブラウザへ配信する構成へ発展させる。

---

## 2. 基本方針

システム全体を以下の2つに分離する。

| 区分 | 構成 | 役割 |
|---|---|---|
| A. Web サービス | Cloudflare + TypeScript | ユーザーのブラウザでゲームと AI を実行 |
| B. AI 研究・学習環境 | ローカル PC + Python | Benchmark / Dataset 生成 / PyTorch 学習 |

**最重要方針: AI 探索は Cloudflare Workers ではなく、ブラウザ上で実行する。**

これにより以下のメリットを得る。

- サーバー CPU 負荷を抑えられる
- AI 実行回数によるサーバーコストをほぼなくせる
- Cloudflare Workers の CPU 制約を気にせず探索できる
- ユーザー数が増えても AI 計算自体は各端末に分散される
- 将来的な ONNX モデルもクライアントサイドで推論できる

Web 版（TypeScript）と研究版（Python）は役割を明確に分ける。Python で強い AI を研究し、その成果を評価関数のパラメータや ONNX モデルとして Web へ持ち込む。

---

## 3. スコープ

### 3.1 ゴール

- Web ブラウザ上で 2048 をプレイできる
- 人間による操作ができる（キーボード / スワイプ）
- AI による自動プレイができる
- AI に「次の一手」だけ考えさせられる
- AI の探索過程や評価値を可視化できる
- Expectimax の探索深度を変更できる
- 評価関数を変更・比較できる
- AI 同士の性能比較ができる
- AI を Web Worker で実行し、UI をブロックしない
- Cloudflare で公開できる
- サーバー側に AI 実行環境を持たなくても動く
- 将来的に ONNX モデルへ置き換えられる
- Python 環境で大量ベンチマーク・学習データ生成ができる

### 3.2 非ゴール（MVP時点でやらないこと）

- ユーザーアカウント・認証機能
- サーバーサイドでのゲーム進行・不正防止
- 対戦・マルチプレイヤー機能
- 課金・収益化機能
- ネイティブアプリ化（PWA 化は将来検討の余地はあるが対象外）

これらは Phase 6 以降（8. 機能一覧 / 18. 開発フェーズを参照）で必要になった場合にのみ、Cloudflare Workers API / D1 / R2 を用いて追加検討する。

---

## 4. システム構成

### 4.1 Web サービス

```
Cloudflare
   │
   │ HTML / CSS / JavaScript / Model
   ▼
Browser
   │
   ├── UI
   ├── 2048 Game Engine
   └── Web Worker
          ├── Expectimax
          └── Evaluator
```

AI 計算は Web Worker 上で行い、メインスレッド（UI）をブロックしない。

### 4.2 学習環境

```
Local PC
   │
   ├── Python
   ├── 2048 Game Engine
   ├── Expectimax
   ├── Benchmark
   ├── Dataset Generator
   └── PyTorch
          ▼
      model.onnx
          ▼
       Web App
```

---

## 5. インフラ

本番環境には Cloudflare を利用する。

| コンポーネント | 用途 | MVP で使うか |
|---|---|---|
| Static Assets（Pages 相当） | HTML/CSS/JS/ONNX モデルの配信 | 使う |
| Workers（必要最小限） | 静的配信のルーティング等 | 必要な範囲のみ |
| D1 | ランキング等を実装する場合 | 使わない |
| R2 | 大型データ（モデル/データセット/リプレイ）の保存 | 使わない |

初期 MVP ではデータベースは不要。基本構成は「Static Assets + 必要最小限の Worker」とする。D1 / R2 / ユーザーアカウント等が必要になるユースケース（Leaderboard, Share, Saved Games, Statistics, AI Competition）は将来拡張として 16 章で扱う。

---

## 6. 技術スタック

### 6.1 Web

- TypeScript
- Vite
- React または Vanilla TypeScript（UI ライブラリは必須ではない。2048 程度の規模なら Vanilla TypeScript でも十分実装可能）
- Web Worker
- Vitest

### 6.2 AI 学習・研究

- Python 3.12+
- NumPy
- pytest
- PyTorch
- ONNX
- ONNX Runtime

---

## 7. リポジトリ構成

Web と Python 実験環境を同一リポジトリに置く。

```
2048-ai/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── web/
│   ├── index.html
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.ts
│   │   │
│   │   ├── game/
│   │   │   ├── board.ts
│   │   │   ├── game.ts
│   │   │   ├── move.ts
│   │   │   ├── rng.ts
│   │   │   └── types.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── player.ts
│   │   │   ├── random-player.ts
│   │   │   ├── greedy-player.ts
│   │   │   ├── expectimax-player.ts
│   │   │   ├── evaluator.ts
│   │   │   └── weights.ts
│   │   │
│   │   ├── worker/
│   │   │   ├── ai-worker.ts
│   │   │   └── protocol.ts
│   │   │
│   │   ├── ui/
│   │   │   ├── board-view.ts
│   │   │   ├── controls.ts
│   │   │   └── stats.ts
│   │   │
│   │   └── model/
│   │       └── neural-player.ts
│   │
│   └── public/
│       └── models/
│
├── research/
│   ├── pyproject.toml
│   ├── src/
│   │   └── game2048/
│   │       ├── board.py
│   │       ├── evaluator.py
│   │       ├── expectimax.py
│   │       ├── dataset.py
│   │       └── model.py
│   │
│   ├── scripts/
│   │   ├── benchmark.py
│   │   ├── generate_dataset.py
│   │   ├── train.py
│   │   └── export_onnx.py
│   │
│   └── tests/
│
├── shared/
│   └── evaluation-spec.md
│
└── wrangler.jsonc
```

`game/rng.ts` は、リプレイ再現（15 章）に必要な seed 可能な乱数生成器を提供する（元設計にはなかったが、再現可能なゲーム進行を実現するために必須のため追加）。

---

## 8. Web アプリの機能（初期バージョン）

### 8.1 Play

通常の 2048 としてプレイする。

- 操作: ↑ / ↓ / ← / →
- スマートフォンではスワイプにも対応する。

### 8.2 AI Move

現在の盤面に対して AI が最善手を1つ提案する。

```
AI recommends: LEFT

Evaluation: 18,492
Depth: 4
Nodes: 12,481
Time: 43 ms
```

### 8.3 Auto Play

AI が自動でゲームを進行する。以下の操作を用意する。

- Start AI
- Pause
- Step
- Reset

---

## 9. ドメインモデル

### 9.1 Board

4×4 の盤面。16 要素の一次元配列として表現する。

```typescript
type Board = number[]; // length === 16
```

例:

```
[
  2, 4, 8, 16,
  0, 2, 4, 8,
  0, 0, 2, 4,
  0, 0, 0, 2,
]
```

空きマスは `0`。

一次元配列にすることで、次を単純化する。

- clone
- serialize
- Worker への転送
- cache key 生成

### 9.2 Direction

```typescript
export type Direction = "up" | "down" | "left" | "right";
```

### 9.3 GameState

```typescript
export interface GameState {
  board: Board;
  score: number;
  moveCount: number;
  gameOver: boolean;
}
```

### 9.4 MoveResult

```typescript
export interface MoveResult {
  board: Board;
  moved: boolean;
  scoreDelta: number;
}
```

---

## 10. ゲームロジック

ゲームロジックは AI や UI から独立させ、可能な限り pure function として実装する。

### 10.1 基本 API

```typescript
move(board: Board, direction: Direction): MoveResult
spawnRandomTile(board: Board, rng: Rng): Board
getValidMoves(board: Board): Direction[]
isGameOver(board: Board): boolean
getEmptyCells(board: Board): number[]
getMaxTile(board: Board): number
```

### 10.2 タイル結合ルール

```
2 2 4 0   →(LEFT)→   4 4 0 0
2 2 2 2   →(LEFT)→   4 4 0 0
```

同じターン中に生成された結合後タイルは再結合しない（No Double Merge）。したがって次の結果にはならない。

```
2 2 4 0   →(LEFT)→   8 0 0 0   ✗ 誤り
```

### 10.3 マージのテストケース

ゲームエンジンは以下のケースを最低限カバーする単体テストを持つこと。

| 入力（LEFT 方向） | 期待される出力 | 備考 |
|---|---|---|
| `2 2 0 0` | `4 0 0 0` | 基本マージ |
| `2 2 2 2` | `4 4 0 0` | 2組同時マージ |
| `4 4 8 8` | `8 16 0 0` | 異なる値の2組同時マージ |
| `2 2 4 0` | `4 4 0 0` | No Double Merge の確認（`8 0 0 0` にはならない） |

### 10.4 ランダムタイル生成

通常の 2048 ルールに従う。

- `2`: 90%
- `4`: 10%
- 位置は空きマスから一様ランダムに選択する。

テスト・リプレイ再現のため、乱数生成には seed 可能な `Rng` インターフェースを用いる。

```typescript
export interface Rng {
  next(): number; // [0, 1)
}
```

### 10.5 Game Over 判定

有効な手が1つも存在しない（どの方向にも移動もマージも起きない）盤面を Game Over とする。例:

```
2 4 2 4
4 2 4 2
2 4 2 4
4 2 4 2
```

---

## 11. AI 設計

### 11.1 Player インターフェース

AI 計算を Worker で行うため、非同期インターフェースとする。

```typescript
export interface Player {
  chooseMove(board: Board): Promise<Direction>;
}
```

### 11.2 AI 種類

以下を実装可能にする。

- Human
- Random
- Greedy
- Expectimax
- Neural（将来拡張、14 章参照）

UI からいつでも切り替えられるようにし、ルールベース探索とニューラルネットの性能をユーザーが比較できるようにする。

### 11.3 Random AI

有効な方向からランダムに選択する。性能比較の最低基準（ベースライン）として用いる。

### 11.4 Greedy AI

1手先だけ探索し、評価関数（12章）で最も評価値の高い手を選択する。

```
Current Board
   ├─ UP
   ├─ DOWN
   ├─ LEFT
   └─ RIGHT
        ▼
    Evaluator
```

### 11.5 Expectimax AI

本サービスの初期メインとなる AI。

2048 では「AI による選択」と「ランダムなタイル生成」が交互に発生するため、相手が敵対的に最善手を選ぶことを仮定する Minimax ではなく、相手の行動を確率分布として扱う **Expectimax** を使用する。

#### 探索ツリー

```
             Board
               │
             MAX
      ┌────────┼────────┐
      ▼        ▼        ▼
     UP       LEFT     RIGHT
      │
    CHANCE
      │
  ┌───┼─────────────
  ▼   ▼
2@A  4@A
2@B  4@B
...
```

- **MAX ノード**: プレイヤーの手番。最も評価値の高い手を選ぶ。
- **CHANCE ノード**: タイル生成。ランダムイベントの期待値を計算する。

#### アルゴリズム

> **元設計からの修正点**: 元の実装案は MAX ノードと CHANCE ノードの両方で `depth` を1ずつ消費していたため、`depth` の値が「読む手数」の約半分にしかならず、UI 上の "Depth: 4" が実際には2手先読みを意味するという分かりにくさがあった。本設計では **1プレイヤー手＝1深度** となるよう、`depth` は CHANCE ノードから MAX ノードへ戻る際にのみ消費する形に修正する。

```typescript
function expectimax(
  board: Board,
  depth: number,
  nodeType: "max" | "chance"
): number {
  if (nodeType === "max") {
    if (depth === 0 || isGameOver(board)) {
      return evaluate(board);
    }

    let best = -Infinity;
    for (const move of getValidMoves(board)) {
      const result = applyMove(board, move);
      best = Math.max(best, expectimax(result.board, depth, "chance"));
    }
    return best;
  }

  // nodeType === "chance"
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) {
    return evaluate(board);
  }

  let expected = 0;
  for (const cell of emptyCells) {
    expected +=
      (0.9 / emptyCells.length) *
      expectimax(placeTile(board, cell, 2), depth - 1, "max");
    expected +=
      (0.1 / emptyCells.length) *
      expectimax(placeTile(board, cell, 4), depth - 1, "max");
  }
  return expected;
}
```

`depth: 4` は「4手先まで自分の手を読む」ことを意味する。

### 11.6 探索深度

ユーザーが変更可能にする。

- Depth 2 / 3 / 4 / 5 / 6（デフォルト: 4）

端末性能によって動的に変更してもよい（Dynamic Depth）。

#### Dynamic Depth

盤面状態（空きマス数）によって探索深度を動的に変更する。終盤ほど深く探索する。

| 空きマス数 | 探索深度 |
|---|---|
| 9 以上 | 3 |
| 5〜8 | 4 |
| 4 以下 | 5 |

### 11.7 Chance Sampling

空きマスが多い場合、`空きマス数 × 2 タイル種別` まで分岐し、計算量が急増する。必要に応じて一部のセルのみをサンプリングして評価する。

例: `empty = 12` のとき `sample = 6` セルのみ展開する。

### 11.8 Cache

探索中に同一盤面が出現するためキャッシュを利用する。

```typescript
const key = `${board.join(",")}:${depth}:${nodeType}`;
```

`Map<string, number>` を用いる。初期実装ではこれでよい。1回の `chooseMove` 呼び出しごとにキャッシュをクリアする（盤面が変わればエントリは無効になるため）。

### 11.9 Bitboard（将来の最適化）

性能が問題になった場合、第2段階として盤面を 64bit 値に圧縮する。

- 各マス 4bit（`0` = empty, `1` = 2, `2` = 4, `3` = 8, `4` = 16, ...）
- 16 マス × 4bit = 64bit
- JavaScript では `BigInt` を利用する

ただし MVP では実装しない。

---

## 12. 評価関数

探索末端の盤面を数値化する。

```typescript
evaluate(board: Board): number
```

評価対象:

- Empty Cells（空きマス数）
- Maximum Tile（最大タイル）
- Corner Bonus（角ボーナス）
- Monotonicity（単調性）
- Smoothness（滑らかさ）
- Merge Potential（結合可能性）
- Snake Pattern（蛇状配置）

### 12.1 符号規約

> **元設計からの補足**: 元の重みリストには各項の加点/減点の方向（符号）が明記されていなかったため明確化する。

`evaluate` は以下のように「盤面が良いほど高くなる」重み付き和として定義する。**Smoothness のみ、値が大きいほど盤面が悪化する（隣接タイルの差が大きい）ためペナルティとして減算する。** それ以外の項はすべて加点として扱う。

```typescript
evaluate(board) =
    weights.empty        * emptyScore(board)
  + weights.monotonicity  * monotonicityScore(board)
  - weights.smoothness    * smoothnessPenalty(board)
  + weights.merge         * mergePotentialScore(board)
  + weights.corner        * cornerBonus(board)
  + weights.snake         * snakeScore(board)
```

### 12.2 Empty Cells

空きマスが多いほど高評価。2048 では特に重要な指標。

```typescript
emptyScore(board) = countEmptyCells(board);
```

### 12.3 Corner Bonus

最大タイルが角にある場合に加点する。理想例:

```
   2    8   32 2048
   4   16   64 1024
   2    8   32  512
   0    2   16  256
```

### 12.4 Monotonicity

行・列ごとに、タイルが大きい方から小さい方へ単調に並ぶ状態を評価する。例:

```
2048 1024 512 256
```

### 12.5 Smoothness

近接するタイルの差を評価する（値そのものではなく `log2(tile)` の差を使用する）。

- 良い例: `128 64 32 16`
- 悪い例: `128 2 64 4`

差が小さいほど盤面が滑らかで良いため、`smoothnessPenalty` は差の絶対値の合計とし、12.1 のとおり `evaluate` から減算する。

### 12.6 Merge Potential

同じ数字が隣接している場合に加点する（例: `4 4` や縦に並ぶ `8 / 8`）。

### 12.7 Snake Pattern

高いタイルを蛇状に維持する盤面を評価する。

```
2048 1024 512 256
  16   32  64 128
   8    4   2   0
   0    0   0   0
```

### 12.8 評価関数の初期重み

```typescript
export interface EvaluationWeights {
  empty: number;
  monotonicity: number;
  smoothness: number;
  merge: number;
  corner: number;
  snake: number;
}

const DEFAULT_WEIGHTS: EvaluationWeights = {
  empty: 327,
  monotonicity: 70,
  smoothness: 15,
  merge: 569,
  corner: 1459,
  snake: 1.2,
};
```

この値は Python 研究環境（14 章）のパラメータ探索スクリプトと Expectimax による検証を経て調整済みの値である（issue #32）。

---

## 13. Web Worker

Expectimax はメインスレッドで実行しない。

```
Main Thread
   │ board
   ▼
Web Worker
   ├── Expectimax
   ├── Evaluator
   └── Cache
   │ result
   ▼
Main Thread
```

### 13.1 Worker 通信プロトコル

リクエスト:

```typescript
interface AIRequest {
  type: "choose-move";
  id: string;
  board: Board;
  depth: number;
}
```

レスポンス:

```typescript
interface AIResponse {
  type: "move-result";
  id: string;
  direction: Direction;
  evaluation: number;
  nodes: number;
  elapsedMs: number;
}
```

### 13.2 AI キャンセル

探索中に Reset / Pause / New Game が押された場合、古い探索結果を無視できるようにする。

- 各リクエストに ID（`requestId`）を付与する。
- 最新リクエスト以外のレスポンスは破棄する。
- 必要になれば Worker 自体を `terminate` して再生成する。

---

## 14. UI

### 14.1 基本画面

```
┌──────────────────────────────┐
│ 2048 AI                      │
│                              │
│ Score             18320      │
│ Max Tile            1024     │
│                              │
│  ┌────┬────┬────┬────┐      │
│  │    │  2 │  8 │512 │      │
│  ├────┼────┼────┼────┤      │
│  │  2 │  4 │ 16 │256 │      │
│  ├────┼────┼────┼────┤      │
│  │    │  2 │  8 │128 │      │
│  ├────┼────┼────┼────┤      │
│  │    │    │  4 │ 64 │      │
│  └────┴────┴────┴────┘      │
│                              │
│ AI: Expectimax               │
│ Depth: 4                     │
│                              │
│ [AI Move] [Auto Play]        │
│ [Pause]   [Reset]            │
└──────────────────────────────┘
```

### 14.2 AI 情報表示

AI による判断を可視化する。

```
UP      12,483
DOWN     8,492
LEFT    18,304  ← BEST
RIGHT   13,993
```

加えて以下も表示する。

- Depth
- Search Nodes
- Elapsed Time
- Cache Hits

これは本サービスの特徴の一つとする。単に 2048 を解くだけでなく、**AI がどのように盤面を評価しているかが見えるサービス**にする。

### 14.3 Auto Play 速度

- Slow / Normal / Fast / Maximum
- Maximum ではアニメーションを省略する。

### 14.4 Benchmark（Web版）

Web 上でも簡易ベンチマークを実行可能にする（例: `Run 100 Games`）。ただし大量実行はローカル Python 環境を推奨する。

### 14.5 非機能要件

- 対応ブラウザ: 最新の evergreen ブラウザ（Chrome / Safari / Firefox / Edge の直近2バージョン）、iOS Safari / Android Chrome を含む。
- AI 探索中も UI 操作・アニメーションが 60fps を維持し、フリーズしない（Web Worker 分離により担保する）。
- キーボード操作のみでプレイ可能であること（アクセシビリティ）。
- 表示言語は日本語を第一とする。多言語対応は将来検討。

---

## 15. Replay と Share（将来拡張）

### 15.1 Replay

ゲーム履歴を保存できる形式を定義する。

```json
{
  "seed": 42,
  "moves": ["left", "down", "left", "up"]
}
```

`seed` と `moves`、および 10.4 節の `Rng` があればゲームを再現できる設計を目指す。

### 15.2 Share

将来的には URL でゲーム結果を共有できる（例: `/game/abc123`）。共有内容は Score / Max Tile / Moves / AI Type / Replay とする。

### 15.3 AI Version

AI の変更によって性能が変わるため、AI にはバージョンを持たせる（例: `expectimax-v1`, `expectimax-v2`, `neural-v1`）。ベンチマーク結果には AI Version を必ず記録する。

### 15.4 Cloudflare 拡張（Leaderboard 等）

Leaderboard / Share / Saved Games / Statistics / User Account / AI Competition などを追加する場合は、以下の Cloudflare コンポーネントを利用する。

- **D1**: ランキングを実装する場合。例: `games` テーブル（`id`, `player_id`, `score`, `max_tile`, `moves`, `ai_type`, `ai_version`, `created_at`）
- **R2**: AI モデル、大型データセット、ベンチマーク結果、リプレイデータを保存したい場合。ただし小さい ONNX モデルは Static Assets で配信してよい。

いずれも MVP スコープ外（3.2 節）であり、初期 MVP では Cloudflare Worker API は原則不要。

---

## 16. Python 研究環境

Web 実装とは別に Python 版を維持する。目的は以下。

- 大量ベンチマーク
- 評価関数のパラメータ調整
- パラメータ探索
- Dataset 生成
- ニューラルネット学習

Web UI に研究用途を持ち込みすぎないよう、責務を分離する。

### 16.1 Benchmark

```bash
python research/scripts/benchmark.py --games 1000 --depth 4
```

出力例:

```
Games: 1000

Average Score: 31,842
Median Score: 28,432
Best Score: 152,804

512:  1.2%
1024: 20.4%
2048: 61.3%
4096: 16.4%
8192: 0.7%
```

記録する指標:

- `score`, `move_count`, `max_tile`
- 2048 / 4096 / 8192 到達率
- average move time, total game time
- nodes searched, cache hit rate

### 16.2 評価関数のパラメータ探索

評価関数の重み（例: `empty = 270`, `corner = 1000`, `merge = 700` 等）を変更しながら 100 ゲーム単位で実行し、最も性能の高い組み合わせを探す。将来的には Random Search / Bayesian Optimization / Evolution Strategy の導入も検討する。

### 16.3 Dataset 生成

Expectimax AI を教師として利用する。

```bash
python research/scripts/generate_dataset.py --games 10000 --depth 5
```

保存するデータの例:

```json
{
  "board": [0, 2, 4, 8, 0, 4, 8, 16, 2, 8, 16, 32, 4, 16, 64, 128],
  "bestAction": "left",
  "values": {
    "up": 312.1,
    "down": 199.8,
    "left": 481.3,
    "right": 288.0
  }
}
```

---

## 17. ニューラルネット版（Phase 8〜9）

### 17.1 構成

```
Board → Neural Network → UP / DOWN / LEFT / RIGHT
```

探索を行わず、1回の推論で次の手を決定する。

### 17.2 入力表現

タイル値を `log2` へ変換する（`empty = 0`, `2 = 1`, `4 = 2`, ..., `2048 = 11`）。入力は 16 要素のベクトルとする。

### 17.3 初期ニューラルネット

小型 MLP から開始する。

```
Input 16
  → Linear 128 → ReLU
  → Linear 128 → ReLU
  → Linear 64  → ReLU
  → Linear 4   (UP / DOWN / LEFT / RIGHT)
```

### 17.4 模倣学習

Expectimax を教師にする。

```
Expectimax → Millions of Boards → Training Dataset → PyTorch → Neural Network
```

Loss は Cross Entropy を基本とし、action value を用いた Soft Target 学習も検討する。

### 17.5 ONNX への変換と配信

```
model.pt → model.onnx
```

学習済みモデルは Web アプリの Static Assets として配信する（`/public/models/2048-ai.onnx`）。

### 17.6 Browser Neural AI（Phase 9）

```
Browser → Board → ONNX Runtime Web → 2048 AI Model → Action
```

この構成でもサーバー側 AI 実行環境は不要。

### 17.7 AI Comparison（Phase 10）

Random / Greedy / Expectimax / Neural を同じ画面で比較できるようにする。

---

## 18. テスト方針

ゲームエンジンは特に厳密にテストする（テストケースは 10.3 節参照）。

- **Game Over 判定テスト**: 10.5 節の盤面が Game Over と判定されること。
- **Worker Test**: `board` を送信 → Worker が探索 → 有効な `Direction` が返る、という一連の流れをテストする。
- **Performance Test**: Depth 3 / 4 / 5 を主要対象として、Depth / Nodes / Elapsed Time を計測する。

---

## 19. 開発フェーズ

| Phase | 内容 | 完了条件 |
|---|---|---|
| 1 | ゲーム本体（Board, Move, Merge, Spawn, Valid Moves, Game Over, UI, Keyboard, Touch, Tests） | 普通の 2048 として Web ブラウザで遊べる |
| 2 | 基本 AI（Random, Greedy, Evaluator） | AI が自動でゲーム終了までプレイできる |
| 3 | Expectimax（MAX Node, Chance Node, Depth, Cache, Evaluation） | Expectimax が 2048 を一定確率で作れる |
| 4 | Web Worker（AI をメインスレッドから分離） | AI 探索中も UI 操作やアニメーションが停止しない |
| 5 | Cloudflare 公開 | 公開 URL から 2048 AI を利用できる |
| 6 | AI Visualization（Action Values, Depth, Nodes, Search Time, Evaluator Breakdown） | AI がなぜその手を選んだかある程度見える |
| 7 | Python 研究環境（Benchmark, Parameter Search, Dataset Generator） | ローカルで大量ベンチマークとデータ生成ができる |
| 8 | Neural AI（PyTorch, Imitation Learning, ONNX） | 教師データからモデルを学習し ONNX へ変換できる |
| 9 | Browser Neural AI（ONNX Runtime Web で推論） | 探索なしで 2048 をプレイできる |
| 10 | AI Comparison（Random / Greedy / Expectimax / Neural） | 複数 AI を同一画面で比較できる |

### 19.1 実装順序（最初のリリースまで）

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

ここまでを最初のリリース（MVP）とする。ニューラルネットワーク、Python Dataset 生成、ONNX 対応はその後の拡張として実装する。

---

## 20. 成功基準

| 区分 | 基準 |
|---|---|
| MVP | Cloudflare 上で公開可能。スマートフォン・PC で動作。AI 自動プレイ可能。UI が AI 探索で固まらない。 |
| Expectimax | 2048 到達率 50% 以上 |
| 改善版 | 2048 到達率 90% 以上、4096 到達可能 |

---

## 21. 最終構成イメージ

```
                  Cloudflare
                      │
                      ▼
                  Web App
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
          UI                 Web Worker
                                  │
                        ┌─────────┴─────────┐
                        ▼                   ▼
                   Expectimax           Neural
                        │                   │
                        ▼                   ▼
                    Evaluator         ONNX Runtime


                   Local Research
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
      Benchmark     Dataset       Weight Search
                        │
                        ▼
                    PyTorch
                        │
                        ▼
                     ONNX
                        │
                        ▼
                   Cloudflare
```

---

## 22. 設計上の最重要ポイント（まとめ）

このサービスでは、**「Cloudflare で AI を動かす」のではなく「Cloudflare から AI を配信する」** という考え方を採用する。

```
Cloudflare → (配信) → Browser → (計算) → 2048 AI
```

これによって、AI の計算量とユーザー数が増えてもサーバー負荷が比例して増えにくい構成になる。

また、Web 版（TypeScript）と研究版（Python）で役割を明確に分ける。Python で強い AI を研究し、その成果を評価関数のパラメータや ONNX モデルとして Web へ持ち込む。
