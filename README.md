# reiva5.github.io

[![CI master](https://github.com/reiva5/reiva5.github.io/actions/workflows/ci.yml/badge.svg?branch=master&event=push)](https://github.com/reiva5/reiva5.github.io/actions/workflows/ci.yml?query=branch%3Amaster)
[![Minimum source-file coverage](https://reiva5.github.io/coverage/coverage.svg)](https://reiva5.github.io/coverage/index.html)

A static personal website with a Hacktoberfest-inspired neo-brutalist style.
Production uses HTML, CSS, and classic JavaScript without runtime dependencies.
Node.js tooling validates and prepares the build. Site content, accessibility
labels, and timestamp formatting use English; profile names and usernames
are preserved as supplied by their owners.

- `index.html`: Home layout and navigation.
- `resume.html`: Resume with Cards, Projects, and Page submenus.
- `styles.css`: theme, typography, and responsive layouts.
- `script.js`: collapsible sidebar and keyboard navigation.
- `resume.js`: hash-based navigation between Resume sections.
- `resume-cards.js`: card classes, platform adapters, and independent loading.
- `data/resume/`: metadata snapshots approved for public display.
- `assets/logos/`: local site logos and the applicable icon license.
- `scripts/build.mjs`: prepares static assets in `dist`.

Home is still an empty placeholder. Resume is available at `resume.html`
and starts with Cards; Projects and Page remain placeholders. Submenus are
directly addressable through URL hashes, including without JavaScript.

The CI badge shows the latest `master` push status. The coverage badge and
report come from the last successful `master` deployment and become available
after the first Actions deployment. Failed builds or tests leave the previous
deployment intact; failed run results remain available in Actions.

## Local preview

Use Node.js 24 and run these commands from the repository root:

```powershell
npm ci
npm run build
npm run preview
```

Then open `http://127.0.0.1:4173/`. The build checks JavaScript syntax and
copies only website assets to `dist`, not dependencies or development tooling.

To view the source without tooling, open `index.html` or `resume.html` directly
in a browser. Profile links work without JavaScript; loading JSON snapshots
requires a local HTTP server rather than a `file:` URL.

## Unit tests

```powershell
npm test
npm run test:coverage
npm run report:coverage
```

Tests use isolated DOMs to cover navigation, the desktop sidebar, the mobile
drawer, ARIA, keyboard focus, viewport changes, card adapters, metadata
validation, isolated failures, timeouts, retries, and English content.
Page JavaScript and reporting/PR metadata helpers require at least **90% per
file** for statements, branches, functions, and lines. The HTML report is at
`coverage/index.html`, unit results use JSON/JUnit XML, and the SVG badge is
at `coverage/coverage.svg`. The badge shows the lowest percentage across
all files and metrics, not an aggregate that could hide an undertested file.
Coverage measures JavaScript rather than an HTML/CSS percentage. Browser
behavior and layout are checked separately with Playwright.

Baseline when CI was introduced: **76 unit tests and 14 browser tests passed**.

| JavaScript metric | Baseline coverage | Covered / total |
| --- | ---: | ---: |
| Statements | 100% | 148 / 148 |
| Branches | 100% | 111 / 111 |
| Functions | 100% | 23 / 23 |
| Lines | 100% | 142 / 142 |

These figures are a historical baseline, not a replacement for the latest
reports in the badge, Pages deployment, and Actions artifacts.

## Browser tests

Install Chromium for Playwright once:

```powershell
npx playwright install chromium
```

```powershell
npm run build
npm run test:browser
```

Browser tests check the built site at widths of 320-1440px, the 760px
breakpoint, real keyboard navigation, the mobile modal, Resume submenus,
and reduced motion. Cards use scripts, logos, and snapshots from that same
build. Tests cover long metadata, provider failures, an exact eight-second
timeout, independent retries, English copy, and KTOM states before and after
a snapshot is available. External API responses are controlled so CI does
not depend on network availability or platform accounts. Tests also work
without Google Fonts. Reports are available in `playwright-report`.

To run all local checks:

```powershell
npm run check
```

## CI/CD

The `CI` workflow runs on pushes, PRs targeting `master`, and manual triggers.

| Check | Passing condition |
| --- | --- |
| `Build` | JavaScript syntax is valid and static assets build successfully. |
| `Unit tests and coverage` | All unit tests pass; every file reaches at least 90% for every metric. |
| `Browser tests` | Built-site behavior and layout pass in Chromium. |

Browser tests use the same `site-dist` artifact as deployment, not a second
build. Unit results in JSON/JUnit, coverage in HTML/LCOV/JSON/SVG, and browser
reports are retained as Actions artifacts for 14 days, including on failure.
Result summaries are available on the workflow run page.

Branch protection for `master` must require all three checks, including for
administrators, and the branch must be up to date before merging. Coverage
thresholds alone do not prevent merging if required checks are disabled.
Changes still go through PRs; approval from another reviewer is not required.

## PR descriptions

The `PR description` workflow includes the complete branch commit list and
commit-message details when a PR is opened or updated. It replaces the
template's managed section without removing manually written summaries or
notes. Commit retrieval uses fixed SHAs and pagination rather than the
default 250-commit limit. Message metadata is treated as text, not code.

The write-enabled workflow checks out only the trusted **base** revision;
it never runs source or dependencies from the PR head. Automation starts
once the workflow is available on `master`; the initial PR introducing it
still needs a commit list when created.

GitHub permits only **Squash and Merge**; merge commits and rebase merging
are disabled. The squash title automatically uses the **PR title**, and its
message uses **all commit-message details**. Feature-branch history retains
separate commits for coherent implementation steps until the PR is merged.

Contribution instructions and manual check commands for the Copilot app
are in `.github/github-app.yml`. This file does not replace GitHub's native
merge settings or branch protection.

## GitHub Pages

The publishing source must be **Settings > Pages > Source > GitHub Actions**,
not direct deployment from a branch. A `master` push publishes the website
only after all three checks pass; PRs and feature branches do not deploy.
The verified artifact and coverage reports are published together at
`https://reiva5.github.io/`.

The `.nojekyll` file indicates that the site does not need Jekyll processing.
Local assets use relative URLs so the site can also be served from a subpath.
Google Fonts are optional; system fonts are used when they cannot be loaded.

## Sidebar

On desktop, the sidebar starts open and the menu button can hide or show it.
At widths of 760px or less, it becomes a drawer that starts closed.

The drawer closes through its close button, the backdrop, or Escape.
Keyboard focus stays inside while it is open. Selecting a navigation link
also closes the drawer. Resume submenu navigation moves focus to the
selected section's heading.

## Resume and profile cards

Resume is available at `resume.html` with three submenus:
`#cards`, `#projects`, and `#resume-page` (labelled **Page**).
Cards is the initial section; Projects and Page intentionally remain
placeholders. URLs support direct navigation and Back/Forward, and retain
their anchor targets when JavaScript is disabled.

### Card types and data sources

Each card provides a full name when available, a username fallback, a fixed
profile link, custom metadata, its data source, and an update time when known.
Unavailable statistics are not replaced with zeros or estimates.

| Platform / class | Candidate custom metadata | Current source |
| --- | --- | --- |
| LinkedIn / `LinkedInCard` | Headline, organization, location, and areas of expertise approved for publication. | `data/resume/linkedin.json`; the Profile API requires approved access and a user token. |
| Codeforces / `CodeforcesCard` | Only Highest Rank and Highest Rating. | Public `user.info` API; maps `maxRank` and `maxRating` when available. Current rank/rating, contribution, and organization are not displayed. |
| LeetCode / `LeetCodeCard` | Solved problems by difficulty, contest rating/ranking, and badges. | `data/resume/leetcode.json`; internal GraphQL/web endpoints are not assumed to be a stable public API. |
| Kaggle / `KaggleCard` | Tiers, medals, and rankings for Competitions, Datasets, Notebooks, and Discussions. | `data/resume/kaggle.json`; profile statistics need a dedicated adapter rather than assuming the CLI exposes every field. |
| KTOM / `KtomCard` | User ID 1601; scores, ranks, or history verified after login. | `data/resume/ktom.json`; the profile redirects visitors to login. The state remains `authentication-required` until a public snapshot is approved. |

Candidate metadata describes planned fields, not claims about account
statistics. Initial LinkedIn, LeetCode, and Kaggle snapshots are empty.
The KTOM snapshot contains only the ID already present in its public URL.
KTOM login/scraping is **not implemented**; its authentication mechanism
and private fields must be verified through an authorized session before
an adapter is written.

References: [Codeforces `user.info`](https://codeforces.com/apiHelp/methods#user.info),
[LinkedIn Profile API and access restrictions](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api),
and [Kaggle CLI documentation](https://github.com/Kaggle/kaggle-cli).

### Site logos

Card headers use logo images rather than letter badges. Images are stored
locally, included in the static build, and available without JavaScript
or profile metadata responses. They display at 32px inside a 48px frame
with `object-fit: contain`, preserving image proportions. Decorative
logos use `alt=""`; the card heading already supplies the platform name.

| Asset | Source |
| --- | --- |
| `linkedin.png` | `LI-In-Bug.png` from the [official LinkedIn logo archive](https://content.linkedin.com/content/dam/me/business/en-us/amp/xbu/linkedin-revised-brand-guidelines/logos/in-logo.zip), following [LinkedIn brand guidelines](https://brand.linkedin.com/). |
| `codeforces.svg`, `leetcode.svg` | Logo paths from [Simple Icons revision `4d29a35`](https://github.com/simple-icons/simple-icons/tree/4d29a35c954699b389a834aacc97dd6e7e74143c/icons), using brand colors without changing the geometry. The CC0 license is included in `assets/logos/SIMPLE-ICONS-LICENSE.txt`. |
| `kaggle.ico` | The [official Kaggle favicon](https://www.kaggle.com/static/images/favicon.ico). |
| `ktom.png` | The apple touch icon from [KTOM's public website](https://ktom-tomi.or.id/), retrieved without login and kept unchanged. |

Logos identify the sites of the linked profiles, not official affiliation
or endorsement. Trademark rights remain with their respective owners;
the Simple Icons CC0 license applies only to the two SVG assets.

### OOP design and independent loading

`ProfileCard` handles identity, text-based rendering, states, timeouts,
and retries. `fetchDetails(signal)` is the adapter contract returning
normalized metadata. `SnapshotCard` implements it for public JSON;
each platform class supplies its own source and identity.
`CodeforcesCard` has a separate API adapter.

All five objects are exposed through `window.ResumeCards.cards`.
Initialization calls `card.load()` for each card without waiting for other
cards and without a rendering barrier based on `Promise.all`. Each call
has its own `AbortController` and **eight-second** deadline. In-flight
requests for the same card are not duplicated. A retry fetches only that
card's source, without browser cookies/credentials or stale metadata caches.

Card states are `idle`, `loading`, `ready`, `empty`,
`authentication-required`, and `error`. HTTP, JSON, data-format, network,
and timeout failures are displayed on the affected card. Identity and
profile links remain available, and the last successful metadata is kept
when a refresh fails. A provider failure does not fail the static build.

### Adding custom metadata

Edit the appropriate platform snapshot using these four fields.
This example demonstrates the format, not an already retrieved profile:

```json
{
  "fullName": "Public display name",
  "metadata": [
    { "label": "Headline", "value": "Public metadata text" },
    { "label": "Count", "value": 0 },
    { "label": "Active", "value": false }
  ],
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "authenticationRequired": false
}
```

Use `fullName: null` when a name is unavailable, `metadata: []` when there
are no details, and `updatedAt: null` when the update time is unknown.
Labels must be nonempty strings; values must be nonempty strings, finite
numbers, or booleans. Explicit zeros and false values are preserved.
`updatedAt` must be a valid date; ISO 8601 UTC is recommended.
Set KTOM's `authenticationRequired` to `false` only after the selected
metadata is verified and approved for public display.

Names and metadata render through `textContent`, not HTML. Usernames
and profile URLs are fixed by the classes and cannot be overridden
by snapshots. **Every field in a snapshot file is publicly readable**,
including fields that are not rendered. Validation is not secret
redaction: never add passwords, tokens, cookies, login email addresses,
or authenticated response dumps to these files.

### Sharing KTOM credentials safely

Do not share credential values through chat, issues, PR descriptions,
source code, or public JSON. Enter them yourself through GitHub
**Settings > Secrets and variables > Actions**, preferably as environment
secrets in a protected `profile-sync` environment restricted to the trusted
`master` branch and requiring approval before a job runs. Use names such
as `KTOM_USERNAME` and `KTOM_PASSWORD`; tell collaborators only the secret
names, not their values. Prefer a read-only token if the platform provides
one. Cookies and sessions are also secrets and need the same protection.

For a future integration, run authenticated retrieval in private tooling
or a GitHub Actions runner, not visitors' JavaScript. Expose secrets only
to the KTOM job, run trusted revisions, and never give PR heads or fork code
access to secrets. Export only an allowlist of approved metadata to public
snapshots. Do not retain raw HTML responses, cookie jars, browser storage
state, login screenshots, traces, or credentials in logs, artifacts, or
builds. A private retrieval repository can keep authentication separate
from the public website repository.

Git ignores `.env`, `.env.*`, and `.private/`; the build copies only an
explicit list of site assets and four public snapshots. Ignore rules are
not a vault and do not protect tracked files. Revoke or rotate a leaked
secret first; deleting a file does not remove it from history. This stage
does not create an authentication workflow or read KTOM secrets.

Configuration reference:
[Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).
