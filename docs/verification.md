# Verification record

## Implementation environment

Verified locally on Windows on 2026-11-26 with Node 24.14.1, Playwright 1.65.1 and Chromium 159.0.8154.6. The session initially had read-only access. After workspace access was enabled, the CLI, tests and packaged consumer smoke were executed locally.

The broken demo completed 10 scenarios, with 6 passed, 4 finding, 0 skipped and 0 errors. The finding scenarios cover two intentional defects at both widths. On mobile the long-value page measured 4631 px at a 390 px viewport and the target occupied horizontal coordinates 4579–4627 px. The HTTP 500 alert was absent at the configured deadline. Fixed mode passed all 10 scenarios. Same-case replay reproduced the long-value finding and the fixed replay passed.

Three unit tests passed. The browser matrix also covered discovery, absent mocks, unavailable pages, interruption, response privacy and replay. The npm tarball was installed into an independent temporary consumer app with a path containing spaces. Its /records route and nested data.records response completed all ten cases. This independent app is synthetic.

The dashboard, standalone report and fixed mobile screenshot were visually inspected. An actual browser recording and synthetic report are committed in docs/example. The video uses placeholder local replay paths in the public report to avoid exposing machine-specific directories.

## Automated coverage

CI is configured for Node 24 on Linux, macOS and Windows. It runs typecheck, unit tests, browser integration, package-content checks, an installed-tarball smoke against an independent synthetic app, and broken/fixed demo runs. It uploads synthetic reports, the lockfile and npm tarball.

Unit coverage includes config limits, local boundary checks, envelope/root-array mutations, explicit text fields, report escaping, paths with spaces, exit codes and partial-run status.

Browser coverage includes ten demo cases, normal state without overflow, measured mobile overflow, the HTTP 500 alert contract, replay, fixed mode, unmatched mock, unavailable page, interruption and privacy checks. The independent tarball smoke uses /records with nested data.records in a separate temporary consumer project.

## Release acceptance still to verify

- Actual CI results and final dependency lockfile review.
- Interactive manual-login handoff with in-memory storage.
- Three realistic application pilots with Codex and Claude Code, including a Next.js browser API route and an authenticated/server-data route.
- Cold and warm timings including browser installation.
- Three-developer comparison against existing Playwright workflows.
- npm package-name ownership, publication and release artifact checks.
- MIT holder confirmation before a stable release.

No measured speed improvement or external adoption is claimed. A release should retain open checks explicitly if they cannot be completed with available access.
