# Launch and release

## v0.1.0 release

Local Playwright CLI with doctor, discover, run, demo and replay. Five response scenarios at mobile and desktop widths. HTML/JSON output with local screenshots, endpoint-hit counts, baseline attribution, measurements and reproduction commands. Synthetic invoice dashboard includes broken and fixed variants.

Version 0.1.0 was published on 26 November 2026 as @larsottojohnsen/break-my-dashboard. Release notes are in release-notes.md. The release has an exact-tarball consumer test, integrity manifest and manual dry-run-first workflow.

## Prepare the artifact

Use a clean checkout of the release source and Node 24. Run these commands from the repository root.

```sh
npm ci --ignore-scripts
npx playwright@1.65.1 install chromium
npm run format:check
npm run typecheck
npm test
npm run test:browser
mkdir release-artifacts
npm pack --json > release-artifacts/pack.json
node tests/package-smoke.mjs ./larsottojohnsen-break-my-dashboard-0.1.0.tgz
node scripts/release-manifest.mjs
npm publish ./larsottojohnsen-break-my-dashboard-0.1.0.tgz --dry-run --access public --ignore-scripts
```

The manifest records the source commit, Node version, complete package file list, SHA-256 and npm SHA-512 integrity. The smoke test installs that exact tarball in a separate temporary consumer and exercises the installed binary and ten scenarios.

## First npm publication

```sh
npm login --auth-type=web --registry=https://registry.npmjs.org
npm whoami
npm publish ./larsottojohnsen-break-my-dashboard-0.1.0.tgz --access public --ignore-scripts
```

The account must own the larsottojohnsen user scope or have publishing access to it. Complete npm's requested account and two-factor-authentication checks in the browser. Compare the file's SHA-256 to checksums.txt before publication. The preparation task uses dry-run mode.

## GitHub Actions publishing

Publishing a GitHub release automatically starts the Prepare or publish npm workflow. Set the package version and lockfile first, commit the changes and create the matching tag, such as v0.1.1. Publish the GitHub release for that tag. The workflow tests the exact tarball, publishes with OIDC and provenance, and retains the publication artifacts. Stable package versions use latest, and prerelease versions use next.

Run the workflow manually with publish=false to verify a branch or tag, including the live npm OIDC exchange. A manual publishing run uses the matching version tag with publish=true. Concurrent runs for the same ref are serialized. Retrying an already published version completes with an explicit skip. npm processing can delay registry availability after a successful publication.

The npm trusted publisher uses GitHub owner Larsottojohnsen, repository break-my-dashboard and workflow filename npm-release.yml, with direct publish permission enabled. The workflow uses GitHub-hosted runners, Node 24 and id-token write permission. It verifies the package-scoped OIDC exchange on every run and holds exchanged tokens only in memory. npm requires CLI 11.5.1 or later. The package repository URL is already set. [npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/)

The public GitHub v0.1.0 release includes the verified tarball, manifest, checksums, demo recording and synthetic example. The Show HN text below is a launch draft.

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
