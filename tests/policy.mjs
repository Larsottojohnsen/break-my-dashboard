import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { guard } from "../dist/browser.js";
import { run } from "../dist/runner.js";
import { demoConfig } from "../dist/demo.js";
import { exitCode } from "../dist/report.js";
import { login } from "../dist/login.js";
import { createHash } from "node:crypto";
import { expectedState } from "../dist/checks.js";

test("ambiguous state selectors produce a coverage skip", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(
      '<div role="alert">First</div><div role="alert">Second</div>',
    );
    const check = await expectedState(page, { role: "alert" }, "error", 100);
    assert.equal(check.status, "skipped");
  } finally {
    await browser.close();
  }
});

test(
  "Next.js HMR delivers its boot message while client frames stay blocked",
  { timeout: 15000 },
  async () => {
    const sockets = new Set();
    let writes = 0;
    let upgrades = 0;
    const server = createServer((_request, response) => {
      response.setHeader("content-type", "text/html");
      response.end(
        '<html><body><script>window.ready=false;const socket=new WebSocket("ws://"+location.host+"/_next/hmr");socket.onmessage=e=>{window.ready=e.data==="ready";socket.send("application-write")};new WebSocket("ws://"+location.host+"/application");</script></body></html>',
      );
    });
    server.on("upgrade", (request, socket) => {
      sockets.add(socket);
      upgrades++;
      const accept = createHash("sha1")
        .update(
          request.headers["sec-websocket-key"] +
            "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
        )
        .digest("base64");
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " +
          accept +
          "\r\n\r\n",
      );
      socket.write(
        Buffer.concat([Buffer.from([0x81, 5]), Buffer.from("ready")]),
      );
      socket.on("data", () => writes++);
      socket.on("error", () => {});
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext();
      const url = "http://127.0.0.1:" + server.address().port;
      const blocked = await guard(context, url);
      const page = await context.newPage();
      await page.goto(url);
      await page.waitForFunction(() => window.ready === true);
      await page.waitForTimeout(100);
      assert.equal(upgrades, 1);
      assert.equal(writes, 0);
      assert.equal(blocked.hmr, 1);
      assert.equal(blocked.writes, 1);
      await context.close();
    } finally {
      await browser.close();
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);

test(
  "authenticated contexts use memory-only session data and preserve read-only testing",
  { timeout: 20000 },
  async () => {
    const out = await mkdtemp(join(tmpdir(), "bmd auth "));
    const secret = "synthetic-private-cookie";
    const server = createServer((request, response) => {
      if (!request.headers.cookie?.includes("auth=" + secret)) {
        response.setHeader("content-type", "text/html");
        response.end("<html><body>Local test login required</body></html>");
        return;
      }
      if (request.url === "/api/invoices") {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            items: [{ supplierName: "Synthetic supplier" }],
            total: 1,
          }),
        );
        return;
      }
      response.setHeader("content-type", "text/html");
      response.end(
        '<html><body><script>fetch("/api/invoices").then(r=>r.json()).then(()=>{const button=document.createElement("button");button.textContent="Approve first invoice";document.body.append(button)})</script></body></html>',
      );
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = "http://127.0.0.1:" + server.address().port + "/invoices";
    try {
      const config = {
        ...demoConfig(url),
        timing: { delayMs: 200, timeoutMs: 1500, runTimeoutMs: 10000 },
      };
      const missing = await run(config, out, { caseId: "normal@390x844" });
      assert.equal(exitCode(missing.report), 2);
      const browser = await chromium.launch();
      let session;
      try {
        const setup = await browser.newContext();
        await setup.addCookies([{ name: "auth", value: secret, url }]);
        session = await setup.storageState({ indexedDB: true });
        await setup.close();
      } finally {
        await browser.close();
      }
      const authenticated = await run(config, out, {
        caseId: "normal@390x844",
        session,
      });
      assert.equal(
        exitCode(authenticated.report),
        0,
        JSON.stringify(authenticated.report.results),
      );
      assert.equal(authenticated.report.results[0].mockHits, 1);
      assert.equal(authenticated.report.requiresLogin, true);
      const serialized = await readFile(
        join(authenticated.directory, "run.json"),
        "utf8",
      );
      assert.ok(!serialized.includes(secret));
      assert.ok(!serialized.includes("cookies"));
      if (!process.stdin.isTTY)
        await assert.rejects(login(url), /interactive terminal/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await rm(out, { recursive: true, force: true });
    }
  },
);

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
