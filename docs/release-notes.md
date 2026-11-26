# Break My Dashboard v0.1.0

Find the dashboard bugs your demo data hides.

This release provides a local TypeScript and Playwright CLI for running five API-response states at mobile and desktop widths. Reports include screenshots, page-width measurements, action positions, endpoint-hit counts and replay commands.

## Included

- doctor, discover, run, demo and replay commands.
- Normal, empty, slow, HTTP 500 and long-value scenarios at two default viewports.
- Standalone HTML and machine-readable JSON evidence.
- Manual local-test login with memory-only session transfer.
- Query and hash routes, root and nested arrays, and Next.js development startup support.
- Synthetic invoice dashboard with broken and fixed modes, screenshots and a browser recording.
- Locked dependencies, cross-platform CI, installed-package smoke and publication integrity checks.

## Try v0.1.0

Use Node 24 LTS and install the version-pinned npm package.

```sh
npm install -g @larsottojohnsen/break-my-dashboard@0.1.0
npx playwright@1.65.1 install chromium
break-my-dashboard doctor
break-my-dashboard demo --out ./results
break-my-dashboard demo --fixed --out ./results
```

The intentionally broken demo exits 1 when its known defects are detected. Fixed mode exits 0. Errors, interrupted runs and absent coverage exit 2.

## Scope

The target must be a local HTTP(S) app with a browser-visible same-origin GET JSON response. Server-rendered-only data produces coverage skips. Unknown UI expectations are recorded as skipped checks. Reports and screenshots can contain application data and should remain local.

Existing-application compatibility and interactive login were exercised with isolated local test data. App-specific evidence is retained privately. Independent blind agent pilots and a three-developer comparison remain open research checks. No measured speed advantage or external adoption is claimed.

MIT license. Copyright Lars Otto Johnsen.
