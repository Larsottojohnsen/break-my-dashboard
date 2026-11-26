import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import assert from "node:assert/strict";
const npmCli =
  process.env.npm_execpath ??
  join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
function command(args, cwd) {
  const result = spawnSync(
    process.platform === "win32" ? process.execPath : "npm",
    process.platform === "win32" ? [npmCli, ...args] : args,
    {
      cwd,
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}
const supplied = process.argv[2];
const packed = JSON.parse(
  command(
    supplied
      ? ["pack", resolve(supplied), "--dry-run", "--ignore-scripts", "--json"]
      : ["pack", "--json"],
    process.cwd(),
  ),
)[0];
assert.ok(packed.files.some((file) => file.path === "demo/index.html"));
assert.ok(packed.files.some((file) => file.path === "dist/cli.js"));
assert.ok(
  !packed.files.some((file) => /results|node_modules|run.json/.test(file.path)),
);
const root = await mkdtemp(join(tmpdir(), "bmd independent "));
const external = join(root, "consumer app");
await mkdir(external);
try {
  await writeFile(
    join(external, "package.json"),
    JSON.stringify({
      name: "independent-dashboard-consumer",
      private: true,
      type: "module",
    }),
  );
  command(
    ["install", "--ignore-scripts", resolve(supplied ?? packed.filename)],
    external,
  );
  command(["exec", "--no", "--", "break-my-dashboard", "doctor"], external);
  // Independent synthetic app has a different route and nested response envelope.
  const { createServer } = await import("node:http");
  const server = createServer((req, res) => {
    if (req.url === "/data/records") {
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({ data: { records: [{ label: "Synthetic record" }] } }),
      );
      return;
    }
    res.setHeader("content-type", "text/html");
    res.end(
      '<html><body><ul id="rows"></ul><script>fetch("/data/records").then(r=>r.json()).then(data=>{for(const row of data.data.records){const li=document.createElement("li");li.textContent=row.label;document.querySelector("#rows").append(li)}})</script></body></html>',
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const config = {
      schemaVersion: 1,
      url: "http://127.0.0.1:" + server.address().port + "/records",
      endpoint: { method: "GET", path: "/data/records" },
      data: { arrayPath: "data.records", longStringFields: ["label"] },
    };
    await writeFile(join(external, "config.json"), JSON.stringify(config));
    const cli = join(
      external,
      "node_modules/@larsottojohnsen/break-my-dashboard/dist/cli.js",
    );
    const result = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          cli,
          "run",
          "--config",
          join(external, "config.json"),
          "--out",
          join(root, "private reports"),
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let stdout = "";
      child.stdout.on("data", (data) => (stdout += data));
      child.stderr.on("data", (data) => (stdout += data));
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, stdout }));
    });
    assert.ok([0, 1].includes(result.code), result.stdout);
    const summary = JSON.parse(result.stdout);
    const saved = JSON.parse(await readFile(summary.run, "utf8"));
    assert.equal(saved.results.length, 10);
    assert.ok(saved.results.every((item) => item.mockHits > 0));
    console.log(
      "Independent tarball smoke passed. Synthetic /records, nested data.records, 10 scenarios.",
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
} finally {
  await rm(root, { recursive: true, force: true });
}
