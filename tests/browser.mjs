import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startDemo, demoConfig } from "../dist/demo.js";
import { run } from "../dist/runner.js";
import { discover } from "../dist/discover.js";
import { exitCode } from "../dist/report.js";
test(
  "browser matrix, baseline, discovery, replay and fixed mode",
  { timeout: 180000 },
  async () => {
    const out = await mkdtemp(join(tmpdir(), "bmd test "));
    const broken = await startDemo(false);
    const fixed = await startDemo(true);
    try {
      const found = await discover(broken.url);
      assert.equal(found.candidates[0].path, "/api/invoices");
      const first = await run(demoConfig(broken.url), out, {
        demo: { fixed: false },
      });
      assert.equal(first.report.expected, 10);
      assert.equal(first.report.results.length, 10);
      assert.equal(
        first.report.results.filter((r) => r.status === "error").length,
        0,
      );
      assert.ok(first.report.results.every((r) => r.mockHits > 0));
      assert.ok(
        first.report.results
          .filter((r) => r.scenario === "normal")
          .every((r) => r.status === "passed"),
      );
      const mobile = first.report.results.find(
        (r) => r.id === "long-values@390x844",
      );
      assert.equal(mobile.status, "finding");
      assert.ok(
        mobile.checks.find((c) => c.name === "page-overflow").observed > 390,
      );
      assert.ok(
        first.report.results
          .filter((r) => r.scenario === "http-500")
          .every((r) =>
            r.checks.some(
              (c) => c.name === "http-500-state" && c.status === "finding",
            ),
          ),
      );
      assert.equal(exitCode(first.report), 1);
      const replay = await run(demoConfig(broken.url), out, {
        caseId: mobile.id,
        previous: mobile,
        demo: { fixed: false },
      });
      assert.equal(replay.report.results[0].status, "finding");
      assert.equal(replay.report.results[0].replayChanged, false);
      const repaired = await run(demoConfig(fixed.url), out, {
        demo: { fixed: true },
      });
      assert.equal(
        exitCode(repaired.report),
        0,
        JSON.stringify(repaired.report.results),
      );
      const fixedReplay = await run(demoConfig(fixed.url), out, {
        caseId: mobile.id,
        previous: mobile,
        demo: { fixed: true },
      });
      assert.equal(exitCode(fixedReplay.report), 0);
      const missing = await run(
        {
          ...demoConfig(fixed.url),
          endpoint: { method: "GET", path: "/api/absent" },
          viewports: [{ width: 390, height: 844 }],
        },
        out,
        { caseId: "empty@390x844" },
      );
      assert.equal(missing.report.results[0].status, "skipped");
      assert.equal(exitCode(missing.report), 2);
      const offline = await run(
        {
          ...demoConfig("http://127.0.0.1:1/invoices"),
          viewports: [{ width: 390, height: 844 }],
        },
        out,
        { caseId: "normal@390x844" },
      );
      assert.equal(exitCode(offline.report), 2);
      const controller = new AbortController();
      const aborted = run(demoConfig(fixed.url), out, {
        signal: controller.signal,
      });
      setTimeout(() => controller.abort(), 200);
      assert.equal(exitCode((await aborted).report), 2);
      const serialized = await readFile(
        join(first.directory, "run.json"),
        "utf8",
      );
      assert.ok(!serialized.includes("Northwind Studio"));
      assert.ok(!serialized.includes("cookies"));
      assert.ok(!serialized.includes("authorization"));
      console.log(
        "SYNTHETIC_BROWSER_RESULT",
        JSON.stringify({
          platform: process.platform,
          expected: first.report.expected,
          statuses: first.report.results.map((r) => ({
            id: r.id,
            status: r.status,
            checks: r.checks,
          })),
          fixedExit: exitCode(repaired.report),
          replay: replay.report.results[0].status,
        }),
      );
    } finally {
      await broken.close();
      await fixed.close();
      await rm(out, { recursive: true, force: true });
    }
  },
);
