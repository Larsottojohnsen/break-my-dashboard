# Run on the user's application

Given the repository link, clone this tool into a cache or temporary directory outside the target app. Use Node 24. Run npm install, npm run build, and node dist/cli.js doctor. If needed install matched Chromium using npx playwright@1.65.1 install chromium. Linux browser dependencies can be installed with --with-deps.

Read the target app's instructions, README, scripts, lockfile and routes. Reuse an available local devserver or start its documented dev command. Track ownership and stop only a server you started. Keep app manifests, lockfiles and code untouched.

Choose one real route with a data table, list or cards. Run node /absolute/path/to/tool/dist/cli.js discover --url http://127.0.0.1:3000/route --out /absolute/cache/bmd --json. Discovery returns paths, candidate array paths and possible display fields. Confirm against source code and observed DOM. Select a same-origin GET JSON response. Avoid auth, logging, analytics and assets.

Inspect an appropriate action in its normal state. Configure an accessible role/name or stable testId. Confirm error, empty and loading selectors from application code, docs or tests. Leave unknown expectations unconfigured. Explicitly choose text display fields. Use countPaths only for documented numeric envelope counts.

Create the small JSON config in the external output folder, following configuration.md, or pipe it with --config -. Run node /absolute/path/to/tool/dist/cli.js run --config /absolute/cache/bmd/config.json --out /absolute/cache/bmd. Paths containing spaces must be quoted. The CLI creates a unique bmd-\* directory and prints absolute report paths.

Read run.json and inspect relevant screenshots in report.html. Return the app route, endpoint, planned/completed counts, findings/skips/errors and up to three concrete measurements. Include report path and complete replay command. With zero findings, state coverage and skipped expectations.

Login must use an existing documented local test flow. The CLI currently has no interactive authenticated-context handoff. If authentication prevents API observation, report that coverage limitation and checks that ran. Never request or save passwords or tokens in the config. Server-side-only data is a coverage limitation.

Real-app replay uses the same local server and fresh response. Changed source hashes or response shapes are marked. Demo replay automatically starts its deterministic synthetic server. A demo result is a separately labeled demonstration.

Keep all real screenshots and reports local, outside the application repository. No report-upload step is part of this workflow.
