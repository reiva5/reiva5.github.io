# reiva5.github.io

[![CI master](https://github.com/reiva5/reiva5.github.io/actions/workflows/ci.yml/badge.svg?branch=master&event=push)](https://github.com/reiva5/reiva5.github.io/actions/workflows/ci.yml?query=branch%3Amaster)
[![Minimum source-file coverage](https://reiva5.github.io/coverage/coverage.svg)](https://reiva5.github.io/coverage/index.html)

A static personal website with a neo-brutalist style. The Resume page features
profile cards for LinkedIn, Codeforces, LeetCode, Kaggle, and KTOM. Home,
Projects, and Page currently remain placeholders.

The CI badge shows the latest `master` push status. The coverage badge links to
the report from the last successful `master` deployment.

## Local Preview

Use Node.js 24 and run these commands from the repository root:

```powershell
npm ci
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/` in a browser.

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
