const LEGACY_HOSTNAME = "2048-ai.wagaya.workers.dev";
const CANONICAL_HOSTNAME = "2048.wagaya.org";

export function handleRequest(request: Request, env: Env): Response | Promise<Response> {
  const url = new URL(request.url);

  if (url.hostname === LEGACY_HOSTNAME) {
    url.protocol = "https:";
    url.hostname = CANONICAL_HOSTNAME;
    url.port = "";
    return Response.redirect(url.toString(), 308);
  }

  return env.ASSETS.fetch(request);
}

export default {
  fetch: handleRequest,
} satisfies ExportedHandler<Env>;
