import { describe, expect, it, vi } from "vitest";
import { handleRequest } from "./index";

function createEnv(response = new Response("asset")): {
  env: Env;
  assetsFetch: ReturnType<typeof vi.fn>;
} {
  const assetsFetch = vi.fn(async () => response);
  const env = {
    ASSETS: { fetch: assetsFetch },
  } as unknown as Env;

  return { env, assetsFetch };
}

describe("Cloudflare Worker", () => {
  it("旧 workers.dev URL をパスとクエリを保って恒久リダイレクトする", async () => {
    const { env, assetsFetch } = createEnv();
    const response = await handleRequest(
      new Request("https://2048-ai.wagaya.workers.dev/play?mode=ai"),
      env,
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://2048.wagaya.org/play?mode=ai");
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it("カスタムドメインへのリクエストは Static Assets へ渡す", async () => {
    const assetResponse = new Response("game", { status: 200 });
    const { env, assetsFetch } = createEnv(assetResponse);
    const request = new Request("https://2048.wagaya.org/");

    const response = await handleRequest(request, env);

    expect(response).toBe(assetResponse);
    expect(assetsFetch).toHaveBeenCalledOnce();
    expect(assetsFetch).toHaveBeenCalledWith(request);
  });
});
