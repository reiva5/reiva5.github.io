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

Each project declares an `iterations` array in its metadata. Each entry has a
positive, unique `number`, a `defaultLanguage`, and a nonempty `languages` array
of `{ "code": "en", "label": "English", "source": "tdd.en.md" }` entries.
Language codes are lowercase language tags such as `id`, `en`, or `pt-br`;
sources are Markdown paths relative to `projects/<slug>/` (no parent traversal).
Add translations to the same iteration, and add later iterations as new entries
with their own sources; keep published sources unchanged to preserve history.
Duplicate iterations/languages, missing defaults, unsafe paths, and missing
source files fail the build.

The project card shows the latest published `iteration-n`. Its existing
`projects/<slug>/` URL opens that iteration in its default language, while
`projects/<slug>/iteration-<n>/<code>/` is a stable link to a specific version.
Language links preserve the iteration; previous/next links preserve the language
when available and otherwise explicitly name the target's default language.
Only published versions are linked, and unavailable previous/next controls are
disabled. All controls are ordinary links and work without JavaScript.
The language picker displays the current language; click it (or focus it and
press Enter/Space) to expand a height-limited, scrollable list of translations.
Choose a language to navigate to its version of the same iteration. The picker
uses native HTML disclosure behavior and remains usable without JavaScript.
Centralized Cloud Infrastructure starts with iteration-1 in Bahasa Indonesia
and English; no later iteration is published yet.

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
