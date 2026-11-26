# Launch preparation

## Proposed v0.1.0 release notes

Local Playwright CLI with doctor, discover, run, demo and replay. Five response scenarios at mobile and desktop widths. HTML/JSON output with local screenshots, endpoint-hit counts, baseline attribution, measurements and reproduction commands. Synthetic invoice dashboard includes broken and fixed variants.

Review docs/verification.md and successful CI artifacts before tagging v0.1.0. npm package ownership and publication remain pending. Produce the release from a clean checkout, run npm pack, inspect its file list, install that tarball in an independent app, and attach the verified tarball and synthetic evidence.

## Twenty-second recording plan

| Time    | Shot                                           |
| ------- | ---------------------------------------------- |
| 0–4 s   | Agent instruction and normal invoice dashboard |
| 4–10 s  | Report matrix and long-values mobile case      |
| 10–15 s | Page-width measurement and replay command      |
| 15–20 s | Same replay with --fixed and passing check     |

The actual synthetic recording is available at example/demo.webm. Dashboard and report screenshots are available beside it. Regenerate with npm run build followed by node scripts/build-example.mjs. The script runs measured broken/fixed cases before capturing the browser. Only synthetic data is included.

## Show HN draft

Show HN: Break My Dashboard - Test your UI with empty, slow, and broken API responses

I kept seeing dashboards that looked done with demo data but broke with long names or failed requests. I built a local Playwright CLI that runs those states on your actual page and returns screenshots plus a way to replay each finding. You can try the included invoice dashboard or give the repo link to your coding agent in your own project. I'd love to hear what it catches or misses on a real page.

External posting is a separate user action. Suggested repository topics are playwright, frontend-testing, dashboard, and developer-tools.
