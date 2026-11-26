#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFile, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { run } from "./runner.js";
import { discover } from "./discover.js";
import { login } from "./login.js";
import { validate } from "./config.js";
import { startDemo, demoConfig } from "./demo.js";
import { exitCode, outputDirectory, type Run } from "./report.js";
const help = `Break My Dashboard 0.1.0
  break-my-dashboard doctor
  break-my-dashboard demo [--fixed] --out <directory>
  break-my-dashboard discover --url <loopback-url> --out <directory> [--json] [--login]
  break-my-dashboard run --config <file|-> --out <directory> [--login]
  break-my-dashboard replay --run <run.json> --case <scenario@widthxheight> [--fixed] [--login] [--out <directory>]
Every run creates a unique bmd-* child directory. Exit 0 clean, 1 findings, 2 blocked/error.
Node 24 and matched Chromium are required.`;
async function readInput(file: string) {
  if (file !== "-") {
    const text = await readFile(file, "utf8");
    if (text.length > 65536) throw new Error("Configuration exceeds 64 KiB.");
    return JSON.parse(text);
  }
  let text = "";
  for await (const chunk of process.stdin) {
    text += chunk;
    if (text.length > 65536) throw new Error("Configuration exceeds 64 KiB.");
  }
  return JSON.parse(text);
}
async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      out: { type: "string" },
      config: { type: "string" },
      url: { type: "string" },
      run: { type: "string" },
      case: { type: "string" },
      json: { type: "boolean" },
      fixed: { type: "boolean" },
      help: { type: "boolean" },
      login: { type: "boolean" },
    },
  });
  const command = positionals[0];
  if (!command || values.help) {
    console.log(help);
    return;
  }
  if (command === "doctor") {
    const require = createRequire(import.meta.url);
    const version = require("playwright/package.json").version;
    let installed = true;
    try {
      await access(chromium.executablePath());
    } catch {
      installed = false;
    }
    let launchable = false;
    if (installed)
      try {
        const browser = await chromium.launch();
        await browser.close();
        launchable = true;
      } catch {}
    const nodeSupported = Number(process.versions.node.split(".")[0]) === 24;
    console.log(
      JSON.stringify(
        {
          node: process.version,
          nodeSupported,
          playwright: version,
          platform: process.platform,
          chromiumInstalled: installed,
          chromiumLaunchable: launchable,
          nextAction: !nodeSupported
            ? "Install Node 24 LTS."
            : !launchable
              ? "Run npx playwright@" +
                version +
                " install chromium (Linux may need --with-deps)."
              : "Ready.",
        },
        null,
        2,
      ),
    );
    process.exitCode = launchable && nodeSupported ? 0 : 2;
    return;
  }
  if (command === "discover") {
    if (!values.url) throw new Error("--url is required.");
    const session = values.login ? await login(values.url) : undefined;
    const result = await discover(values.url, session);
    const directory = await outputDirectory(values.out ?? "./results");
    await writeFile(
      join(directory, "discovery.json"),
      JSON.stringify(result, null, 2),
      { flag: "wx" },
    );
    console.log(JSON.stringify({ ...result, directory }, null, 2));
    process.exitCode = result.candidates.length ? 0 : 2;
    return;
  }
  if (command === "demo") {
    const server = await startDemo(!!values.fixed);
    try {
      const result = await run(
        demoConfig(server.url),
        values.out ?? "./results",
        { demo: { fixed: !!values.fixed } },
      );
      console.log(
        JSON.stringify(
          {
            report: join(result.directory, "report.html"),
            run: join(result.directory, "run.json"),
            expected: result.report.expected,
            statuses: result.report.results.map((r) => ({
              case: r.id,
              status: r.status,
            })),
          },
          null,
          2,
        ),
      );
      process.exitCode = exitCode(result.report);
    } finally {
      await server.close();
    }
    return;
  }
  if (command === "run") {
    if (!values.config)
      throw new Error("--config is required. Use - for stdin.");
    const config = validate(await readInput(values.config));
    const session = values.login ? await login(config.url) : undefined;
    const result = await run(config, values.out ?? "./results", { session });
    console.log(
      JSON.stringify(
        {
          report: join(result.directory, "report.html"),
          run: join(result.directory, "run.json"),
          exitCode: exitCode(result.report),
        },
        null,
        2,
      ),
    );
    process.exitCode = exitCode(result.report);
    return;
  }
  if (command === "replay") {
    if (!values.run || !values.case)
      throw new Error("--run and --case are required.");
    const saved = (await readInput(values.run)) as Run;
    if (saved.schemaVersion !== 1 || !Array.isArray(saved.results))
      throw new Error("Unsupported saved run.");
    const previous = saved.results.find((result) => result.id === values.case);
    if (!previous) throw new Error("Case is absent from saved run.");
    const session =
      values.login && !saved.demo
        ? await login(validate(saved.config).url)
        : undefined;
    const server = saved.demo
      ? await startDemo(values.fixed ?? saved.demo.fixed)
      : undefined;
    try {
      const config = { ...saved.config, url: server?.url ?? saved.config.url };
      const result = await run(config, values.out ?? dirname(values.run), {
        caseId: previous.id,
        demo: server ? { fixed: values.fixed ?? saved.demo!.fixed } : undefined,
        previous,
        session,
      });
      console.log(
        JSON.stringify(
          {
            report: join(result.directory, "report.html"),
            run: join(result.directory, "run.json"),
            exitCode: exitCode(result.report),
          },
          null,
          2,
        ),
      );
      process.exitCode = exitCode(result.report);
    } finally {
      await server?.close();
    }
    return;
  }
  throw new Error("Unknown command. Use --help.");
}
main().catch((error: unknown) => {
  console.error(
    "Blocked or invalid run. " +
      (error instanceof Error
        ? error.message
        : "Check arguments, local server and doctor.") +
      " Use --help for usage.",
  );
  process.exitCode = 2;
});
