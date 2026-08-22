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

本プロジェクトは Cloudflare Workers の Static Assets 機能を使い、`dist/` を静的配信する（`wrangler.jsonc`）。サーバーサイドの Worker スクリプトは持たない。

1. Cloudflare アカウントにログインする（初回のみ）

   ```bash
   npx wrangler login
   ```

2. ビルドしてデプロイする

   ```bash
   npm run deploy
   ```

デプロイ後に表示される URL でアプリにアクセスできる。

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
```
