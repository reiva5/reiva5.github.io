# reiva5.github.io

[![CI master](https://github.com/reiva5/reiva5.github.io/actions/workflows/ci.yml/badge.svg?branch=master&event=push)](https://github.com/reiva5/reiva5.github.io/actions/workflows/ci.yml?query=branch%3Amaster)
[![Minimum source-file coverage](https://reiva5.github.io/coverage/coverage.svg)](https://reiva5.github.io/coverage/index.html)

A static personal website with a neo-brutalist style. The Resume page features
profile cards for LinkedIn, Codeforces, LeetCode, Kaggle, and KTOM. Project lists
work as cards with Draft (yellow), Proposed (blue), or Implemented (green) status.
Its first project is Centralized Cloud Infrastructure, with a styled technical
design document covering AWS, Azure, GCP, and Cloudflare. Home and the complete
resume Page remain placeholders.

The CI badge shows the latest `master` push status. The coverage badge links to
the report from the last successful `master` deployment.

## Local Preview

Use Node.js 24 and run these commands from the repository root:

```powershell
npm ci
npx playwright install chromium --only-shell
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/` in a browser.

## Project Documents

Open `project.html` for the project list. Metadata lives in `data/projects.json`;
each project's Markdown source lives in `projects/<slug>/tdd.md`. To add a project,
add its metadata and document, then rebuild. Supported status values are exactly
`Draft`, `Proposed`, and `Implemented`; invalid status values fail the build.

The build converts GFM Markdown into sanitized, themed HTML with a table of
contents, scrollable tables/code, and local SVG Mermaid diagrams. The original
Markdown is also available to download. Node dependencies and Chromium are
development/build tools only: production remains HTML, CSS, SVG, and classic
JavaScript, and documents/diagrams remain readable with JavaScript disabled.
Diagram syntax errors fail the build rather than publishing a broken diagram.

## Unit Test

```powershell
npm test
```

To generate coverage reports:

```powershell
npm run test:coverage
npm run report:coverage
```

The HTML report is available at `coverage/index.html`.

## Browser Test

Install the test browser once:

```powershell
npx playwright install chromium
```

Build the site and run the browser tests:

```powershell
npm run build
npm run test:browser
```

Reports are available in `playwright-report`.
