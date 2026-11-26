# Run on the user's application

Given the repository link, create a cache or temporary directory outside the target app. Use Node 24. In that directory run npm install --ignore-scripts @larsottojohnsen/break-my-dashboard@0.1.0, then npm exec --no -- break-my-dashboard doctor. Use the installed CLI at /absolute/path/to/cache/node_modules/@larsottojohnsen/break-my-dashboard/dist/cli.js for subsequent commands. If needed install matched Chromium using npx playwright@1.65.1 install chromium. Linux browser dependencies can be installed with --with-deps.

Read the target app's instructions, README, scripts, lockfile and routes. Reuse an available local devserver or start its documented dev command. Track ownership and stop only a server you started. Keep app manifests, lockfiles and code untouched.

Choose one real route with a data table, list or cards. Run node /absolute/path/to/cache/node_modules/@larsottojohnsen/break-my-dashboard/dist/cli.js discover --url http://127.0.0.1:3000/route --out /absolute/cache/bmd --json. Discovery returns paths, candidate array paths and possible display fields. Confirm against source code and observed DOM. Select a same-origin GET JSON response. Avoid auth, logging, analytics and assets.

Inspect an appropriate action in its normal state. Configure an accessible role/name or stable testId. Confirm error, empty and loading selectors from application code, docs or tests. Leave unknown expectations unconfigured. Explicitly choose text display fields. Use countPaths only for documented numeric envelope counts.

Create the small JSON config in the external output folder, following configuration.md, or pipe it with --config -. Run node /absolute/path/to/cache/node_modules/@larsottojohnsen/break-my-dashboard/dist/cli.js run --config /absolute/cache/bmd/config.json --out /absolute/cache/bmd. Paths containing spaces must be quoted. The CLI creates a unique bmd-\* directory and prints absolute report paths.

Read run.json and inspect relevant screenshots in report.html. Return the app route, endpoint, planned/completed counts, findings/skips/errors and up to three concrete measurements. Include report path and complete replay command. With zero findings, state coverage and skipped expectations.

Login should first use an existing documented local test flow. Otherwise add --login to the command and run it in an interactive terminal or PTY. The CLI opens an isolated visible browser for the user to sign in with a local test account. Ask the user to finish sign-in and return to the local dashboard, then send Enter to the terminal. The CLI closes the setup browser, keeps session state in memory, and enables the read-only policy in fresh test contexts. Each command starts a fresh session. If discovery is blocked by authentication, inspect source for the endpoint and configure one authenticated run to keep manual sign-in to one step. Never request or save passwords or tokens in the config. An unavailable interactive terminal or desktop blocks manual login and returns exit 2. Report that limitation and the checks that ran. Server-side-only data is a coverage limitation.

Real-app replay uses the same local server and fresh response. Changed source hashes or response shapes are marked. Demo replay automatically starts its deterministic synthetic server. A demo result is a separately labeled demonstration.

Keep all real screenshots and reports local, outside the application repository. No report-upload step is part of this workflow.
