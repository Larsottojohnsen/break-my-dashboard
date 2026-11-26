# Troubleshooting

Run break-my-dashboard doctor to see Node, platform, Playwright and Chromium status. Use Node 24. Install the matching browser with npx playwright@1.65.1 install chromium. Linux may require --with-deps. Browser installation is never an implicit package install step.

An error result means a valid conclusion was blocked. Confirm the local server responds, the selected endpoint returns HTTP 200 JSON, and Chromium can launch. Scenario deadlines include navigation, interception, state checks and screenshots. An interrupted run writes a partial report where possible and exits 2.

A skipped endpoint means the browser did not reach the configured GET. Check route, login, exact pathname and server-side rendering. Service workers are blocked. HTTP writes, WebSockets and external-origin requests are blocked and counted. Locally proxy required dependencies when your documented dev setup permits it.

Redirect chains are resolved inside interception, with each hop checked against the original origin. Up to six hops are allowed. Content from a same-origin redirect is served at the original browser URL, which can affect applications that rely on the final URL for routing. Select the final local route directly in those applications.

UI selectors must match exactly one element. A missing target in an empty or error state is a skipped position check. A configured expected state absent at its deadline is a finding. Uncaught JavaScript errors are reported as counts without copying exception contents into reports.

Use a fresh child output directory per run. The tool creates it exclusively. Report and screenshot names are generated from fixed scenario names and validated viewport numbers. To clean a private report, remove the specific bmd-\* directory using your file manager. Review the folder before removal.

Screenshots can expose private app data. Keep them local. A public bug report should use the synthetic demo or a minimized synthetic fixture.
