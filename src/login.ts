import { createInterface } from "node:readline/promises";
import { chromium, type BrowserContext } from "playwright";
import { localUrl } from "./config.js";

export type Session = Awaited<ReturnType<BrowserContext["storageState"]>>;

export async function login(input: string): Promise<Session> {
  const url = localUrl(input);
  if (!process.stdin.isTTY)
    throw new Error(
      "Manual login needs an interactive terminal and a visible desktop. Run with a PTY or use the app's documented local test flow.",
    );
  const browser = await chromium.launch({ headless: false });
  const terminal = createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  const deadline = setTimeout(interrupt, 300000);
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const page = await context.newPage();
    await page.goto(url.href, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    console.error(
      "Sign in manually with the app's local test account in the isolated browser. Credentials and session data stay in memory. The read-only test policy starts after this setup step.",
    );
    await terminal.question("Press Enter when the local dashboard is ready. ", {
      signal: controller.signal,
    });
    if (new URL(page.url()).origin !== url.origin)
      throw new Error("Return to the local dashboard before continuing.");
    return await context.storageState({ indexedDB: true });
  } finally {
    clearTimeout(deadline);
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    terminal.close();
    await browser.close();
  }
}
