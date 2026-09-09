/**
 * monitor.wagaya.org 向けの共通ヘルスチェック規格（Monitor Health Check Protocol v1）に
 * 沿ったレスポンスを返す。仕様: https://github.com/onishi/monitor/blob/main/SPEC.md#22
 */
export async function checkHealth(env: Env): Promise<Response> {
  const now = new Date().toISOString();

  let assetsOk = true;
  let message = "静的アセットの取得に成功";
  try {
    const res = await env.ASSETS.fetch(new Request("https://2048.wagaya.org/index.html"));
    if (!res.ok) {
      assetsOk = false;
      message = `静的アセットの取得に失敗: HTTP ${res.status}`;
    }
  } catch (err) {
    assetsOk = false;
    message = `静的アセットの取得に失敗: ${err instanceof Error ? err.message : String(err)}`;
  }

  const status = assetsOk ? "ok" : "critical";

  const body = {
    protocol_version: "1.0",
    service: { id: "2048", name: "2048 AI", environment: "production" },
    generated_at: now,
    status,
    checks: [
      {
        id: "web-root",
        type: "web",
        name: "静的アセット配信",
        status,
        message,
        checked_at: now,
      },
    ],
    alert_urls: [
      {
        label: "Cloudflare Workers ダッシュボード",
        url: "https://dash.cloudflare.com/?to=/:account/workers/services/view/2048-ai",
      },
      { label: "GitHub リポジトリ", url: "https://github.com/onishi/2048" },
    ],
  };

  return Response.json(body, { status: 200 });
}
