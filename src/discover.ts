import { guard, launch, readJson } from "./browser.js";
import { localUrl } from "./config.js";
import type { Session } from "./login.js";
export async function discover(input: string, session?: Session) {
  const url = localUrl(input);
  const browser = await launch();
  const candidates = new Map<
    string,
    {
      path: string;
      arrayPaths: string[];
      displayFields: string[];
      signals: string[];
    }
  >();
  const pending: Promise<void>[] = [];
  const context = await browser.newContext({
    serviceWorkers: "block",
    storageState: session,
  });
  const deadline = setTimeout(() => {
    void context.close().catch(() => {});
  }, 15000);
  try {
    const blocked = await guard(context, url.href);
    const page = await context.newPage();
    page.on("response", (response) => {
      const path = new URL(response.url()).pathname;
      if (
        response.request().method() !== "GET" ||
        new URL(response.url()).origin !== url.origin ||
        response.status() !== 200 ||
        !response.headers()["content-type"]?.includes("json") ||
        /auth|login|logout|telemetry|analytics|logging|\.(js|css|png|svg|ico)$/.test(
          path,
        )
      )
        return;
      pending.push(
        (async () => {
          try {
            const body = await readJson(response);
            const arrayPaths: string[] = [];
            let displayFields: string[] = [];
            const visit = (value: any, at: string, depth: number) => {
              if (depth > 5) return;
              if (Array.isArray(value)) {
                arrayPaths.push(at);
                if (value[0] && typeof value[0] === "object")
                  displayFields = Object.keys(value[0]).filter(
                    (key) =>
                      /name|title|description|label/i.test(key) &&
                      typeof value[0][key] === "string",
                  );
              } else if (value && typeof value === "object") {
                for (const [key, child] of Object.entries(value))
                  visit(child, at ? at + "." + key : key, depth + 1);
              }
            };
            visit(body, "", 0);
            if (arrayPaths.length)
              candidates.set(path, {
                path,
                arrayPaths,
                displayFields,
                signals: [
                  "Observed same-origin HTTP 200 GET JSON",
                  "Contains array data",
                  "Confirm display fields against application source",
                ],
              });
          } catch {
            /* Oversized or invalid JSON is excluded. */
          }
        })(),
      );
    });
    const response = await page.goto(url.href, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });
    if (!response || response.status() >= 400)
      throw new Error("Local route unavailable.");
    await page.waitForFunction(
      () => document.readyState === "complete",
      undefined,
      { timeout: 10000 },
    );
    // Bounded observation window includes client effects and delayed requests.
    await page.waitForTimeout(1500);
    await Promise.allSettled(pending);
    return {
      schemaVersion: 1,
      route: url.pathname + url.search + url.hash,
      candidates: [...candidates.values()].sort(
        (a, b) => b.displayFields.length - a.displayFields.length,
      ),
      blocked,
      limitations: [
        "Only browser-visible local GET JSON is eligible.",
        "Candidate selectors and expectations require source/DOM confirmation.",
        "Server-rendered data and undocumented login flows need separate setup.",
      ],
    };
  } finally {
    clearTimeout(deadline);
    await context.close().catch(() => {});
    await browser.close();
  }
}
