import { chromium, type BrowserContext, type Route } from "playwright";
import { localUrl } from "./config.js";
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export async function launch() {
  return chromium.launch({ headless: true });
}
export async function guard(
  context: BrowserContext,
  url: string,
  handle?: (route: Route) => Promise<boolean>,
) {
  const origin = localUrl(url).origin;
  const blocked = { writes: 0, external: 0 };
  await context.route("**/*", async (route) => {
    const request = route.request();
    const target = new URL(request.url());
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      blocked.writes++;
      await route.abort();
      return;
    }
    if (target.origin !== origin || target.username || target.password) {
      blocked.external++;
      await route.abort();
      return;
    }
    if (handle && (await handle(route))) return;
    // Playwright does not re-route every hop of a browser redirect chain.
    // Resolve each hop here so no external redirect reaches the network.
    let next = target;
    try {
      for (let hop = 0; hop < 6; hop++) {
        const response = await route.fetch({
          url: next.href,
          maxRedirects: 0,
          timeout: 10000,
        });
        const location = response.headers().location;
        if ([301, 302, 303, 307, 308].includes(response.status()) && location) {
          next = new URL(location, next);
          await response.dispose();
          if (next.origin !== origin || next.username || next.password) {
            blocked.external++;
            await route.abort();
            return;
          }
          continue;
        }
        await route.fulfill({ response });
        await response.dispose();
        return;
      }
      await route.abort();
    } catch {
      await route.abort().catch(() => {});
    }
  });
  // WebSockets can write outside the HTTP request guard.
  await context.routeWebSocket(/.*/, (socket) => socket.close());
  return blocked;
}
export async function readJson(response: {
  headers(): Record<string, string>;
  body(): Promise<Buffer>;
}) {
  const headers = response.headers();
  if (!headers["content-type"]?.includes("json"))
    throw new Error("Selected endpoint did not return JSON.");
  if (Number(headers["content-length"] ?? 0) > MAX_RESPONSE_BYTES)
    throw new Error("JSON response exceeds 2 MiB.");
  const buffer = await response.body();
  if (buffer.length > MAX_RESPONSE_BYTES)
    throw new Error("JSON response exceeds 2 MiB.");
  return JSON.parse(buffer.toString("utf8"));
}
