import { join } from "node:path";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { Browser } from "playwright";
import { validate, type Config } from "./config.js";
import { guard, launch, readJson } from "./browser.js";
import { scenarios, mutate, shape, type Scenario } from "./scenarios.js";
import { layout, locator, expectedState } from "./checks.js";
import type { Session } from "./login.js";
import {
  outputDirectory,
  writeReport,
  type Run,
  type CaseResult,
} from "./report.js";
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
type Options = {
  caseId?: string;
  demo?: { fixed: boolean };
  previous?: CaseResult;
  signal?: AbortSignal;
  session?: Session;
};
async function runCase(
  browser: Browser,
  config: Config,
  scenario: Scenario,
  viewport: Config["viewports"][number],
  directory: string,
  signal: AbortSignal,
  session?: Session,
): Promise<CaseResult> {
  const start = Date.now();
  const result: CaseResult = {
    id: scenario + "@" + viewport.width + "x" + viewport.height,
    scenario,
    viewport,
    status: "passed",
    mockHits: 0,
    changedValues: 0,
    checks: [],
    durationMs: 0,
  };
  const context = await browser.newContext({
    viewport,
    locale: "en-US",
    timezoneId: "UTC",
    serviceWorkers: "block",
    storageState: session,
  });
  const abort = () => {
    void context.close().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, config.timing.timeoutMs + 3000);
  let interceptionError = false;
  let mutationUnavailable = false;
  let jsErrors = 0;
  let releaseSlow: (() => void) | undefined;
  const slowReady = new Promise<void>((resolve) => {
    releaseSlow = resolve;
  });
  let responseFinished: (() => void) | undefined;
  const finished = new Promise<void>((resolve) => {
    responseFinished = resolve;
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(config.timing.timeoutMs);
    if (signal.aborted) throw new Error("Run interrupted");
    page.on("pageerror", () => jsErrors++);
    result.blocked = await guard(context, config.url, async (route) => {
      if (
        route.request().method() !== "GET" ||
        new URL(route.request().url()).pathname !== config.endpoint.path
      )
        return false;
      result.mockHits++;
      try {
        const response = await route.fetch({
          maxRedirects: 0,
          timeout: config.timing.timeoutMs,
        });
        if (response.status() !== 200)
          throw new Error("Baseline endpoint must return HTTP 200.");
        const payload = await readJson(response);
        result.sourceShape = hash(shape(payload));
        result.sourceHash = hash(payload);
        let changed = { body: payload, changed: 0 };
        try {
          changed = mutate(payload, scenario, config.data);
        } catch {
          mutationUnavailable = true;
        }
        result.changedValues += changed.changed;
        if (scenario === "slow") {
          releaseSlow?.();
          await delay(config.timing.delayMs, undefined, { signal });
        }
        await route.fulfill({
          status: scenario === "http-500" ? 500 : 200,
          contentType: "application/json",
          body: JSON.stringify(
            scenario === "http-500"
              ? { error: "Synthetic test failure" }
              : changed.body,
          ),
        });
      } catch {
        interceptionError = true;
        await route.abort().catch(() => {});
      } finally {
        responseFinished?.();
      }
      return true;
    });
    const navigation = page.goto(config.url, {
      waitUntil: "domcontentloaded",
      timeout: config.timing.timeoutMs,
    });
    // The loading-phase check runs before navigation is awaited below.
    void navigation.catch(() => {});
    if (scenario === "slow") {
      const sawSlow = await Promise.race([
        slowReady.then(() => true),
        delay(config.timing.timeoutMs, false, { signal }),
      ]);
      if (sawSlow) {
        result.checks.push(
          await expectedState(
            page,
            config.checks.loading,
            "loading-during-delay",
            Math.max(100, config.timing.delayMs / 2),
          ),
        );
        result.loadingScreenshot = result.id + "-loading.png";
        await page.screenshot({
          path: join(directory, result.loadingScreenshot),
          timeout: config.timing.timeoutMs,
        });
      }
    }
    const response = await navigation;
    if (!response || response.status() >= 400)
      throw new Error("Page unavailable");
    await Promise.race([
      finished,
      delay(config.timing.timeoutMs, undefined, { signal }),
    ]);
    // DOM stability is bounded and independent of unrelated network activity.
    await page.waitForFunction(
      () => {
        const doc = document as Document & {
          bmdText?: string;
          bmdStableSince?: number;
        };
        const text = document.body?.innerText ?? "";
        if (doc.bmdText !== text) {
          doc.bmdText = text;
          doc.bmdStableSince = Date.now();
        }
        return Date.now() - (doc.bmdStableSince ?? Date.now()) > 250;
      },
      undefined,
      { timeout: config.timing.timeoutMs },
    );
    if (!result.mockHits) {
      result.status = "skipped";
      result.reason =
        "Selected GET endpoint was not observed. Server-rendered data or login may prevent coverage.";
    } else if (interceptionError) {
      throw new Error("Selected response unavailable");
    } else if (
      mutationUnavailable &&
      (scenario === "empty" || scenario === "long-values")
    ) {
      result.status = "skipped";
      result.reason =
        "Configured array or display fields were absent, invalid, or empty.";
    } else {
      const state =
        scenario === "empty"
          ? config.checks.empty
          : scenario === "http-500"
            ? config.checks.error
            : undefined;
      if (scenario === "empty" || scenario === "http-500")
        result.checks.push(
          await expectedState(
            page,
            state,
            scenario + "-state",
            config.timing.timeoutMs,
          ),
        );
      if (
        ["normal", "slow", "long-values"].includes(scenario) &&
        config.checks.target
      )
        result.checks.push(
          await expectedState(
            page,
            config.checks.target,
            "target-visible-after-response",
            config.timing.timeoutMs,
          ),
        );
      if (scenario === "slow" && config.checks.loading) {
        try {
          await locator(page, config.checks.loading).waitFor({
            state: "hidden",
            timeout: config.timing.timeoutMs,
          });
          result.checks.push({
            name: "loading-after-response",
            status: "passed",
            expected: "hidden",
            observed: "hidden",
          });
        } catch {
          result.checks.push({
            name: "loading-after-response",
            status: "finding",
            expected: "hidden",
            observed: "still visible",
          });
        }
      }
      result.checks.push(...(await layout(page, config)));
      result.checks.push({
        name: "uncaught-javascript-errors",
        status: jsErrors ? "finding" : "passed",
        expected: 0,
        observed: jsErrors,
      });
      result.status = result.checks.some((c) => c.status === "finding")
        ? "finding"
        : "passed";
    }
    result.screenshot = result.id + ".png";
    await page.screenshot({
      path: join(directory, result.screenshot),
      timeout: config.timing.timeoutMs,
    });
  } catch {
    result.status = "error";
    result.reason = signal.aborted
      ? "Run interrupted or global deadline reached."
      : "Navigation, JSON capture, selector, or scenario deadline failed. Check local server, endpoint and Chromium with doctor.";
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    await context.close().catch(() => {});
    result.durationMs = Date.now() - start;
  }
  return result;
}
export async function run(input: unknown, out: string, options: Options = {}) {
  const config = validate(input);
  const cases = config.viewports
    .flatMap((viewport) =>
      scenarios.map((scenario) => ({ scenario, viewport })),
    )
    .filter(
      (item) =>
        !options.caseId ||
        item.scenario +
          "@" +
          item.viewport.width +
          "x" +
          item.viewport.height ===
          options.caseId,
    );
  if (!cases.length) throw new Error("Unknown replay case.");
  const directory = await outputDirectory(out);
  const started = Date.now();
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  options.signal?.addEventListener("abort", interrupt, { once: true });
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const deadline = setTimeout(interrupt, config.timing.runTimeoutMs);
  const report: Run = {
    schemaVersion: 1,
    cliVersion: "0.1.0",
    browserVersion: "unavailable",
    createdAt: new Date().toISOString(),
    config,
    expected: cases.length,
    results: [],
    interrupted: false,
    requiresFreshResponse: !options.demo,
    demo: options.demo,
    durationMs: 0,
  };
  let browser: Browser | undefined;
  try {
    browser = await launch();
    report.browserVersion = browser.version();
    for (const item of cases) {
      if (controller.signal.aborted) {
        report.results.push({
          id:
            item.scenario +
            "@" +
            item.viewport.width +
            "x" +
            item.viewport.height,
          ...item,
          status: "skipped",
          mockHits: 0,
          changedValues: 0,
          checks: [],
          durationMs: 0,
          reason: "Run interrupted before scenario.",
        });
        continue;
      }
      const result = await runCase(
        browser,
        config,
        item.scenario,
        item.viewport,
        directory,
        controller.signal,
        options.session,
      );
      const baseline = report.results.find(
        (r) =>
          r.scenario === "normal" && r.viewport.width === item.viewport.width,
      );
      if (baseline)
        for (const check of result.checks) {
          if (
            check.status === "finding" &&
            baseline.checks.some(
              (c) =>
                c.name === check.name &&
                c.status === "finding" &&
                c.observed === check.observed,
            )
          )
            check.inherited = true;
        }
      if (options.previous)
        result.replayChanged =
          options.previous.sourceHash !== result.sourceHash ||
          options.previous.sourceShape !== result.sourceShape;
      report.results.push(result);
    }
  } catch {
    report.interrupted = true;
    report.results.push({
      id: "browser-start",
      scenario: "normal",
      viewport: config.viewports[0],
      status: "error",
      mockHits: 0,
      changedValues: 0,
      checks: [],
      durationMs: 0,
      reason: "Chromium unavailable. Run break-my-dashboard doctor.",
    });
  } finally {
    clearTimeout(deadline);
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    options.signal?.removeEventListener("abort", interrupt);
    await browser?.close().catch(() => {});
    report.interrupted ||= controller.signal.aborted;
    report.durationMs = Date.now() - started;
    await writeReport(directory, report);
  }
  return { directory, report };
}
