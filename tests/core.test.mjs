import test from "node:test";
import assert from "node:assert/strict";
import { validate, localUrl } from "../dist/config.js";
import { mutate } from "../dist/scenarios.js";
import { html, exitCode } from "../dist/report.js";
const config = () =>
  validate({
    schemaVersion: 1,
    url: "http://127.0.0.1:3000/invoices",
    endpoint: { method: "GET", path: "/api/invoices" },
    data: {
      arrayPath: "items",
      longStringFields: ["supplierName"],
      countPaths: ["total"],
    },
  });
test("validate local targets and configuration limits", () => {
  assert.throws(() => localUrl(42));
  assert.equal(
    localUrl("http://localhost:3000/dashboard?view=tasks").search,
    "?view=tasks",
  );
  assert.equal(localUrl("http://127.0.0.1:4317/#models").hash, "#models");
  assert.throws(() => localUrl("http://localhost/#access_token=private"));
  assert.equal(config().viewports.length, 2);
  for (const url of [
    "https://example.com",
    "http://127.0.0.1.evil.com",
    "file:///tmp/app",
    "http://user:secret@localhost/",
    "http://localhost/?token=private",
  ])
    assert.throws(() => localUrl(url));
  assert.throws(() => validate({ ...config(), schemaVersion: 2 }));
  assert.throws(() =>
    validate({ ...config(), endpoint: { method: "POST", path: "/api" } }),
  );
  assert.throws(() =>
    validate({
      ...config(),
      data: { arrayPath: "__proto__.items", longStringFields: [] },
    }),
  );
  assert.throws(() =>
    validate({ ...config(), viewports: [{ width: -1, height: 400 }] }),
  );
  assert.throws(() =>
    validate({
      ...config(),
      timing: { delayMs: 1000, timeoutMs: 10, runTimeoutMs: 100 },
    }),
  );
});
test("empty and long mutations preserve envelope and machine fields", () => {
  const input = {
    items: [
      {
        id: "abc",
        supplierName: "North",
        status: "pending",
        date: "2026-01-01",
      },
    ],
    total: 1,
  };
  assert.deepEqual(mutate(input, "empty", config().data).body, {
    items: [],
    total: 0,
  });
  const long = mutate(input, "long-values", config().data);
  assert.equal(long.changed, 1);
  assert.equal(long.body.items[0].id, "abc");
  assert.equal(long.body.items[0].status, "pending");
  assert.equal(input.items[0].supplierName, "North");
  assert.ok(long.body.items[0].supplierName.length > 500);
  assert.deepEqual(
    mutate([1, 2], "empty", { arrayPath: "", longStringFields: [] }).body,
    [],
  );
  assert.throws(() => mutate({}, "empty", config().data));
  assert.throws(() => mutate({ items: [] }, "long-values", config().data));
});
test("report escaping, spaces and exit semantics", () => {
  const run = {
    schemaVersion: 1,
    cliVersion: "0.1.0",
    browserVersion: "test",
    createdAt: "test",
    config: config(),
    expected: 1,
    results: [
      {
        id: '<script>alert("x")</script>',
        scenario: "normal",
        viewport: { width: 390, height: 844 },
        status: "passed",
        mockHits: 1,
        changedValues: 0,
        checks: [
          { name: "layout", status: "passed", expected: 390, observed: 390 },
        ],
        durationMs: 1,
      },
    ],
    interrupted: false,
    requiresFreshResponse: true,
    durationMs: 1,
  };
  const output = html(run, "/tmp/path with spaces/run.json");
  assert.ok(output.includes("&lt;script&gt;"));
  run.requiresLogin = true;
  assert.ok(html(run, "/tmp/run.json").includes(" --login"));
  assert.ok(output.includes("&quot;/tmp/path with spaces/run.json&quot;"));
  assert.ok(!output.includes('<script>alert("x")</script>'));
  assert.equal(exitCode(run), 0);
  run.results[0].status = "finding";
  assert.equal(exitCode(run), 1);
  run.interrupted = true;
  assert.equal(exitCode(run), 2);
  run.interrupted = false;
  run.results[0].status = "skipped";
  run.results[0].checks = [];
  assert.equal(exitCode(run), 2);
});
