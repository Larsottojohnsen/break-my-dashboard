import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { startDemo, demoConfig } from "../dist/demo.js";
import { run } from "../dist/runner.js";
import { html, exitCode } from "../dist/report.js";

const root = resolve("docs/example");
const privateRoot = resolve("../output/break-my-dashboard");
await mkdir(root, { recursive: true });
const broken = await startDemo(false);
const fixed = await startDemo(true);
let browser;
try {
  const first = await run(demoConfig(broken.url), privateRoot, {
    demo: { fixed: false },
  });
  const previous = first.report.results.find(
    (result) => result.id === "long-values@390x844",
  );
  const repaired = await run(demoConfig(fixed.url), privateRoot, {
    caseId: previous.id,
    previous,
    demo: { fixed: true },
  });
  if (exitCode(first.report) !== 1 || exitCode(repaired.report) !== 0)
    throw new Error("Demo evidence failed verification.");
  for (const [name, result] of [
    ["broken", first],
    ["fixed", repaired],
  ]) {
    const destination = join(root, name);
    await mkdir(destination, { recursive: true });
    for (const item of result.report.results) {
      for (const image of [item.screenshot, item.loadingScreenshot].filter(
        Boolean,
      )) {
        await copyFile(join(result.directory, image), join(destination, image));
      }
    }
    await writeFile(
      join(destination, "run.json"),
      JSON.stringify(result.report, null, 2) + "\n",
    );
    await writeFile(
      join(destination, "report.html"),
      html(result.report, "/local/synthetic-demo/" + name + "/run.json"),
    );
  }
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    timezoneId: "UTC",
  });
  const page = await context.newPage();
  await page.goto(broken.url);
  await page
    .getByRole("button", { name: "Approve first invoice", exact: true })
    .waitFor();
  await page.screenshot({ path: join(root, "dashboard.png") });
  await page.goto(pathToFileURL(join(root, "broken/report.html")).href);
  await page.locator("#width").selectOption("390");
  await page.locator("#findings").check();
  await page.screenshot({ path: join(root, "report.png") });
  await context.close();

  // Record the actual dashboard, report measurements and passing replay.
  let recording;
  try {
    recording = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      recordVideo: { dir: privateRoot, size: { width: 1280, height: 900 } },
    });
    const screen = await recording.newPage();
    const video = screen.video();
    await screen.goto(broken.url);
    await screen
      .getByRole("button", { name: "Approve first invoice", exact: true })
      .waitFor();
    await screen.waitForTimeout(4000);
    await screen.goto(pathToFileURL(join(root, "broken/report.html")).href);
    await screen.locator("#width").selectOption("390");
    await screen.locator("#findings").check();
    await screen
      .locator("article")
      .filter({ hasText: "long-values@390x844" })
      .scrollIntoViewIfNeeded();
    await screen.waitForTimeout(6000);
    await screen
      .locator("article")
      .filter({ hasText: "long-values@390x844" })
      .getByRole("button", { name: "Copy replay command" })
      .click();
    await screen.waitForTimeout(5000);
    await screen.goto(pathToFileURL(join(root, "fixed/report.html")).href);
    await screen.waitForTimeout(5000);
    await recording.close();
    recording = undefined;
    await video.saveAs(join(root, "demo.webm"));
    console.log("Recorded actual synthetic demo to docs/example/demo.webm");
  } catch (error) {
    await recording?.close();
    console.log(
      "Recording remains open. Screenshots and capture plan are available. " +
        error.message,
    );
  }
  console.log(
    JSON.stringify(
      {
        report: join(first.directory, "report.html"),
        replay: previous.id,
        statuses: first.report.results.map((result) => ({
          id: result.id,
          status: result.status,
        })),
        repaired: repaired.report.results[0].status,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  await broken.close();
  await fixed.close();
}
