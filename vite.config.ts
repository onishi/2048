import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "web",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  // onnxruntime-web は内部で import.meta.url を使って wasm バイナリを解決する。
  // esbuild による dep pre-bundling を通すとその解決が壊れ、dev サーバーで
  // wasm の代わりに index.html (SPA fallback) が返ってしまうため除外する。
  optimizeDeps: {
    exclude: ["onnxruntime-web"],
  },
  test: {
    root: ".",
    include: ["web/src/**/*.test.ts"],
    environment: "jsdom",
  },
});
