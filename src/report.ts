import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { Config } from "./config.js";
import type { Check } from "./checks.js";
export interface CaseResult {
  id: string;
  scenario: string;
  viewport: { width: number; height: number };
  status: "passed" | "finding" | "skipped" | "error";
  mockHits: number;
  changedValues: number;
  checks: Check[];
  durationMs: number;
  screenshot?: string;
  loadingScreenshot?: string;
  sourceShape?: string;
  sourceHash?: string;
  replayChanged?: boolean;
  reason?: string;
  blocked?: { writes: number; external: number; hmr?: number };
}
export interface Run {
  schemaVersion: 1;
  cliVersion: string;
  browserVersion: string;
  createdAt: string;
  config: Config;
  expected: number;
  results: CaseResult[];
  interrupted: boolean;
  requiresFreshResponse: boolean;
  requiresLogin?: boolean;
  demo?: { fixed: boolean };
  durationMs: number;
}
export const escapeHtml = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
export async function outputDirectory(parent: string) {
  const root = resolve(parent);
  await mkdir(root, { recursive: true });
  return mkdtemp(join(root, "bmd-"));
}
export function exitCode(run: Run) {
  if (
    run.interrupted ||
    run.results.some((r) => r.status === "error") ||
    !run.results.some((r) => r.checks.some((c) => c.status !== "skipped"))
  )
    return 2;
  return run.results.some((r) => r.status === "finding") ? 1 : 0;
}
export function html(run: Run, absoluteRunPath: string) {
  const e = escapeHtml;
  const counts = ["passed", "finding", "skipped", "error"]
    .map(
      (status) =>
        status + " " + run.results.filter((r) => r.status === status).length,
    )
    .join(" · ");
  return `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<title>Break My Dashboard report</title><style>
:root{color-scheme:dark}body{font:16px system-ui;background:#111820;color:#e5edf3;margin:0;padding:32px}
main{max-width:1400px;margin:auto}h1{font-size:36px;margin-bottom:8px}p{color:#b9c7d1}
.controls{display:flex;gap:20px;flex-wrap:wrap;margin:28px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,500px),1fr));gap:20px}
article{border:1px solid #354454;border-radius:12px;padding:20px;min-width:0;background:#17222d}
article[data-status=finding]{border-color:#e4a44b}article[data-status=error]{border-color:#eb7285}
img{width:100%;max-height:480px;object-fit:contain;object-position:top;background:#fff}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:10px 5px;border-bottom:1px solid #354454;overflow-wrap:anywhere}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#0d141c;padding:14px}button,select{padding:9px;color:inherit;background:#253646;border:1px solid #586c7e;border-radius:5px}
[hidden]{display:none!important}a{color:#86d9cb}
</style><main><h1>Break My Dashboard</h1>
<p>${e(new URL(run.config.url).pathname + new URL(run.config.url).search + new URL(run.config.url).hash)} · Chromium ${e(run.browserVersion)} · ${e(run.createdAt)}</p>
<p>${run.results.length} / ${run.expected} scenarios · ${e(counts)}</p>
<p>${run.interrupted ? "Interrupted. Partial report." : "Completed."} Replay ${run.requiresFreshResponse ? "uses a fresh local response. Response hashes and shapes are compared." : "uses deterministic synthetic demo fixtures."}</p>
<div class="controls"><label><input id="findings" type="checkbox"> Findings only</label>
<label>Width <select id="width"><option value="">All viewports</option>${run.config.viewports.map((v) => `<option>${v.width}</option>`).join("")}</select></label></div>
<div class="grid">${run.results
    .map((result) => {
      const command =
        "break-my-dashboard replay --run " +
        JSON.stringify(absoluteRunPath) +
        " --case " +
        JSON.stringify(result.id) +
        (run.requiresLogin ? " --login" : "");
      return `<article data-status="${e(result.status)}" data-width="${result.viewport.width}"><h2>${e(result.id)}</h2><p>${e(result.status)} · ${result.mockHits} endpoint hits · ${result.changedValues} changed values · ${result.durationMs} ms</p>
${result.reason ? `<p>${e(result.reason)}</p>` : ""}
${result.replayChanged ? "<p>Fresh response differs from the original source. Reproduction may differ.</p>" : ""}
<p>Blocked requests · writes ${result.blocked?.writes ?? 0} · external ${result.blocked?.external ?? 0} · read-only HMR ${result.blocked?.hmr ?? 0}</p>
<table><thead><tr><th>Check</th><th>Status</th><th>Expected</th><th>Observed</th></tr></thead><tbody>${result.checks.map((check) => `<tr><td>${e(check.name)}${check.inherited ? " (baseline)" : ""}</td><td>${e(check.status)}</td><td>${e(check.expected)}</td><td>${e(check.observed)}</td></tr>`).join("")}</tbody></table>
${result.loadingScreenshot ? `<details><summary>Loading phase</summary><img alt="Loading phase" src="${e(result.loadingScreenshot)}"></details>` : ""}
${result.screenshot ? `<a href="${e(result.screenshot)}"><img alt="${e(result.id)} screenshot" src="${e(result.screenshot)}"></a>` : ""}
<pre>${e(command)}</pre><button class="copy">Copy replay command</button></article>`;
    })
    .join("")}</div></main><script>
const apply=()=>document.querySelectorAll('article').forEach(card=>card.hidden=(document.querySelector('#findings').checked&&card.dataset.status!=='finding')||(document.querySelector('#width').value&&card.dataset.width!==document.querySelector('#width').value));
document.querySelectorAll('input,select').forEach(control=>control.addEventListener('change',apply));
document.querySelectorAll('.copy').forEach(button=>button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(button.previousElementSibling.textContent);button.textContent='Copied'}catch{button.textContent='Select the command above to copy'}}));
</script></html>`;
}
export async function writeReport(directory: string, run: Run) {
  await writeFile(
    join(directory, "run.json"),
    JSON.stringify(run, null, 2) + "\n",
    { flag: "wx" },
  );
  await writeFile(
    join(directory, "report.html"),
    html(run, join(directory, "run.json")),
    { flag: "wx" },
  );
}
