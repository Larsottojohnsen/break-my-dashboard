# Verification record

## Implementation environment

Verified locally on Windows on 2026-11-26 with Node 24.14.1, Playwright 1.65.1 and Chromium 159.0.8154.6. The session initially had read-only access. After workspace access was enabled, the CLI, tests and packaged consumer smoke were executed locally.

The broken demo completed 10 scenarios, with 6 passed, 4 finding, 0 skipped and 0 errors. The finding scenarios cover two intentional defects at both widths. On mobile the long-value page measured 4631 px at a 390 px viewport and the target occupied horizontal coordinates 4579–4627 px. The HTTP 500 alert was absent at the configured deadline. Fixed mode passed all 10 scenarios. Same-case replay reproduced the long-value finding and the fixed replay passed.

Three unit tests passed. The browser matrix also covered discovery, absent mocks, unavailable pages, interruption, response privacy and replay. The npm tarball was installed into an independent temporary consumer app with a path containing spaces. Its /records route and nested data.records response completed all ten cases. This independent app is synthetic.

The dashboard, standalone report and fixed mobile screenshot were visually inspected. An actual browser recording and synthetic report are committed in docs/example. The video uses placeholder local replay paths in the public report to avoid exposing machine-specific directories.

## Automated coverage

The source revision c0f122e passed all jobs on Linux, macOS and Windows on 2026-11-26. Each job completed formatting, typecheck, three unit tests, four browser integration tests, installed-package smoke and broken/fixed demo generation. Each platform has a downloadable artifact with its synthetic reports, lockfile and tarball. [Successful CI run](https://github.com/Larsottojohnsen/break-my-dashboard/actions/runs/45803001250)

CI is configured for Node 24 on Linux, macOS and Windows. It runs typecheck, unit tests, browser integration, package-content checks, an installed-tarball smoke against an independent synthetic app, and broken/fixed demo runs. It uploads synthetic reports, the lockfile and npm tarball.

Unit coverage includes config limits, local boundary checks, envelope/root-array mutations, explicit text fields, report escaping, paths with spaces, exit codes and partial-run status.

Browser coverage includes ten demo cases, normal state without overflow, measured mobile overflow, the HTTP 500 alert contract, replay, fixed mode, unmatched mock, unavailable page, interruption and privacy checks. The independent tarball smoke uses /records with nested data.records in a separate temporary consumer project.

Additional browser tests cover missing Chromium with a partial report, blocked writes, external navigation redirects and in-memory authenticated cookie transfer. The installed npm binary is invoked through npm exec in the independent consumer. Manual --login has a five-minute interactive setup deadline and then transfers session state into read-only contexts.

## Launch-readiness follow-up

The packaged tool was exercised against three existing local applications covering a Vite client, a Next.js browser API and a server-rendered route. Test data and authentication were isolated from operational databases. The interactive --login CLI flow was completed with a human-operated test-account login. First and warm runs, replay outcomes and a fresh Chromium download were measured. Application-specific results and screenshots are held in a private local protocol outside this repository.

These pilots exposed and led to fixes for query/hash navigation, Chromium local-network permission, Next.js HMR startup, ambiguous error selectors, authenticated replay and missing-endpoint slow cases. Regression tests cover those fixes. The current suite includes three unit tests and six browser integration tests.

## Open owner and research checks

- npm account authentication, first publication and trusted-publisher configuration.
- Independent one-sentence blind pilots across both Codex and Claude Code. Claude Code was installed but unauthenticated during this implementation session.
- Three-developer comparison against existing Playwright workflows.

The compatibility pilots used the implementing Codex session and source-guided local setup. The timing experiment used a fresh package directory and browser download with warm OS/npm caches and a prestarted application. No measured speed improvement, clean-machine agent benchmark or external adoption is claimed.
