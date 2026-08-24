# 2048 AI

Web ブラウザ上で動作する、Expectimax 探索による自動プレイ AI 付きの 2048。詳しい設計は [`SPEC.md`](./SPEC.md)、開発計画は [`PLAN.md`](./PLAN.md) を参照。

AI の探索計算はサーバーではなくブラウザ（Web Worker）上で実行するため、サーバー側に AI 実行環境は不要。

## セットアップ

```bash
npm install
```

## 開発

```bash
npm run dev
```

`http://localhost:5173` でアクセスできる。

## テスト・型チェック

```bash
npm test          # Vitest
npm run typecheck  # tsc --noEmit
```

## ビルド

```bash
npm run build
```

`dist/` に静的アセット一式が出力される。

## Cloudflare へのデプロイ

本プロジェクトは Cloudflare Workers の Static Assets 機能を使い、`dist/` を静的配信する（`wrangler.jsonc`）。公開 URL は <https://2048.wagaya.org/>。

Worker スクリプトは、旧 URL `https://2048-ai.wagaya.workers.dev/` へのアクセスをパスとクエリを保ったまま公開 URL へ恒久リダイレクトし、それ以外のリクエストを Static Assets へ渡す。

1. Cloudflare アカウントにログインする（初回のみ）

   ```bash
   npx wrangler login
   ```

2. ビルドしてデプロイする

   ```bash
   npm run deploy
   ```

デプロイすると `2048.wagaya.org` の Custom Domain と DNS が Cloudflare により管理される。

### GitHub Actions による自動デプロイ

`.github/workflows/deploy.yml` により、`main` への push と手動実行時にテスト・型チェック・本番ビルドを行い、成功した場合のみ Cloudflare Workers へデプロイする。

GitHub リポジトリの Actions secrets に以下を設定する。

- `CLOUDFLARE_ACCOUNT_ID`: デプロイ先の Cloudflare Account ID
- `CLOUDFLARE_API_TOKEN`: [Cloudflare の API Tokens 画面](https://dash.cloudflare.com/profile/api-tokens)で作成し、対象アカウントのみにスコープを限定して `Edit Cloudflare Workers` 権限を付与した API Token

GitHub CLI で設定する場合、値をコマンドライン引数へ含めず、プロンプトから入力する。

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_API_TOKEN
```

ローカルで Cloudflare の実行環境を再現して確認したい場合は、デプロイせずに以下を実行する。

```bash
npm run cf:dev
```

## プロジェクト構成

```
web/src/
├── game/    # ゲームロジック（盤面・移動・マージ・乱数）
├── ai/      # AI（Random / Greedy / Expectimax、評価関数）
├── worker/  # Expectimax を実行する Web Worker とその通信
└── ui/      # 盤面描画・キーボード/スワイプ操作

research/    # Python 研究環境（Benchmark / パラメータ探索 / 教師データ生成）
```

## Python 研究環境 (research/)

大量ベンチマークやパラメータ探索、教師データ生成をローカルで行うための Python 環境。
ゲームロジック・評価関数・Expectimax は Web 版と完全に同じ挙動になるよう移植しており、
`research/tests/fixtures/` の TypeScript 版の実行結果と突き合わせるテストで担保している。

```bash
cd research
uv venv .venv
source .venv/bin/activate
uv pip install -e ".[dev]"

pytest                                              # テスト
python scripts/benchmark.py --games 100 --depth 3   # ベンチマーク
python scripts/param_search.py --trials 20 --games 20  # 評価関数の重み探索
python scripts/generate_dataset.py --games 100 --depth 3  # 教師データ生成 (JSON Lines)
```

性能上の注意: 現状は TypeScript 版と同一の純粋な Python 実装であり、V8 の JIT のような
最適化がないため Expectimax は depth を上げると大幅に遅くなる。手早く試す場合は
`--depth 2〜3` から始めることを推奨する。

### Neural AI（Phase 8: 学習 / ONNX変換）

Expectimax を教師にした模倣学習と ONNX への変換を行う。追加で `torch` / `onnx` /
`onnxruntime` が必要なため、`ml` extra を別途インストールする。

```bash
uv pip install -e ".[dev,ml]"

python scripts/generate_dataset.py --games 1000 --depth 3 --output dataset.jsonl
python scripts/train.py --dataset dataset.jsonl --epochs 20 --output model.pt
python scripts/export_onnx.py --model model.pt --output model.onnx

# 学習済みモデルで自己対局し、他の AI とスコアを比較する
python scripts/benchmark.py --games 20 --ai neural --model-path model.pt
```

`pip install torch` は環境によっては CUDA ランタイム込みの巨大な wheel を要求することがある。
CPU 専用の軽量な wheel が必要な場合は
[pytorch.org の案内](https://pytorch.org/get-started/locally/) に従って
`--index-url https://download.pytorch.org/whl/cpu` を使うこと。

### Browser Neural AI（Phase 9）

`web/public/models/2048-ai.onnx` に配置したモデルは、ブラウザ上で
[ONNX Runtime Web](https://github.com/microsoft/onnxruntime) を使って推論する
(`web/src/model/neural-player.ts`)。AI選択で「Neural」を選ぶと、探索を行わず
1回の推論だけで次の手を決める。モデルを再学習した場合は `export_onnx.py` の
出力をこのパスに上書きすれば反映される。

同梱のモデルは `research/scripts/generate_dataset.py --games 300 --depth 2` で生成した
約50万局面のデータセットで学習したもの(issue #33)。旧モデル(40ゲーム分、約2,000スコア
水準)と比べて平均スコアは約2倍、最高到達タイルも512→1024相当まで伸びている。ただし
`SPEC.md #16.3` が想定する数百万局面規模にはまだ及ばないため、さらに強くするには
より大規模なデータセット(depth を上げる、ゲーム数を増やす)での再学習が有効。
