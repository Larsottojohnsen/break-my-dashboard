# Agent instructions

Read docs/agent-quickstart.md before using this tool on another app. The user's current request controls the target and scope.

For implementation, use Node 24, TypeScript and Playwright pinned in package.json. Keep private app code and reports outside this repository. Run typecheck, unit, browser integration and package smoke. Report observed results and open checks accurately.

The demo is synthetic. Keep baseline, mutation, skip and runtime-error evidence distinct. Never substitute a demo run for a requested real-app run. Preserve read-only browser policy, escaped standalone reports and exclusive output directories.

Release checks are listed in docs/verification.md. A published release requires verified artifacts and honest platform claims.
