import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { guard } from "../dist/browser.js";

test("browser policy blocks writes and external navigation redirects", async () => {
  let writes = 0;
  const server = createServer((request, response) => {
    if (request.method === "POST") writes++;
    if (request.url === "/redirect") {
      response.writeHead(302, { location: "http://example.invalid/" });
      response.end();
      return;
    }
    response.setHeader("content-type", "text/html");
    response.end(
      '<html><body>Read-only fixture<script>fetch("/write",{method:"POST"}).catch(()=>{});fetch("http://example.invalid/data").catch(()=>{});</script></body></html>',
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    const blocked = await guard(context, url);
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForTimeout(100);
    assert.equal(writes, 0);
    assert.equal(blocked.writes, 1);
    assert.equal(blocked.external, 1);
    await assert.rejects(page.goto(url + "/redirect", { timeout: 2000 }));
    assert.equal(blocked.external, 2);
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test(
  "missing Chromium gives diagnostic exit and valid partial report",
  { timeout: 15000 },
  async () => {
    const out = await mkdtemp(join(tmpdir(), "bmd missing browser "));
    const cli = resolve("dist/cli.js");
    async function command(args) {
      return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [cli, ...args], {
          env: {
            ...process.env,
            PLAYWRIGHT_BROWSERS_PATH: join(out, "missing"),
          },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        child.stdout.on("data", (data) => (output += data));
        child.stderr.on("data", (data) => (output += data));
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, output }));
      });
    }
    try {
      const doctor = await command(["doctor"]);
      assert.equal(doctor.code, 2);
      assert.equal(JSON.parse(doctor.output).chromiumInstalled, false);
      const demo = await command(["demo", "--out", out]);
      assert.equal(demo.code, 2);
      const summary = JSON.parse(demo.output);
      const run = JSON.parse(await readFile(summary.run, "utf8"));
      assert.equal(run.interrupted, true);
      assert.equal(run.results[0].status, "error");
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  },
);
