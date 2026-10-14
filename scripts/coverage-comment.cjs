const { METRICS, renderTestSummary } = require("./coverage-badge.cjs");
const { escapeMarkdown } = require("./pr-description.cjs");

const COMMENT_MARKER = "<!-- pr-unit-coverage -->";

function readLineCoverage(lcov) {
  if (typeof lcov !== "string" || !lcov.trim()) {
    throw new TypeError("A nonempty LCOV report is required.");
  }
  const files = new Map();
  let current;
  for (const line of lcov.split(/\r?\n/)) {
    if (line.startsWith("SF:")) {
      if (current) {
        throw new Error("LCOV source record is incomplete.");
      }
      const path = line.slice(3).replace(/\\/g, "/");
      if (/[:\x00-\x1f\x7f]/.test(path) ||
          path.split("/").some((part) => !part || part === "." || part === "..")) {
        throw new Error("LCOV source paths must be repository-relative.");
      }
      if (files.has(path)) {
        throw new Error("LCOV report contains duplicate source files.");
      }
      current = { path, covered: [], uncovered: [], seen: new Set() };
    } else if (line.startsWith("DA:")) {
      const match = /^DA:([1-9]\d*),(\d+)(?:,[^,]+)?$/.exec(line);
      if (!current || !match || !Number.isSafeInteger(Number(match[1])) ||
          !Number.isSafeInteger(Number(match[2]))) {
        throw new Error("Invalid LCOV line coverage.");
      }
      const number = Number(match[1]);
      if (current.seen.has(number)) {
        throw new Error("LCOV report contains duplicate line numbers.");
      }
      current.seen.add(number);
      (Number(match[2]) > 0 ? current.covered : current.uncovered).push(number);
    } else if (line === "end_of_record") {
      if (!current) {
        throw new Error("LCOV source record is missing.");
      }
      const { path, covered, uncovered } = current;
      files.set(path, { path, covered, uncovered });
      current = undefined;
    }
  }
  if (current || files.size === 0) {
    throw new Error("LCOV report is incomplete or contains no source files.");
  }
  return [...files.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function lineLinks(lines, sourceUrl) {
  const ranges = [];
  for (const line of lines.toSorted((left, right) => left - right)) {
    const previous = ranges.at(-1);
    if (previous && line === previous[1] + 1) {
      previous[1] = line;
    } else {
      ranges.push([line, line]);
    }
  }
  return ranges.length === 0 ? "None" : ranges.map(([first, last]) => first === last
    ? `[${first}](${sourceUrl}#L${first})`
    : `[${first}-${last}](${sourceUrl}#L${first}-L${last})`).join(", ");
}

function runStamp(run) {
  return `<!-- coverage-run:${run.id}:${run.run_attempt} -->`;
}

function runSummary(run) {
  return `CI result: **${escapeMarkdown(run.conclusion)}**. Tested commit: [\`${run.head_sha.slice(0, 7)}\`](${run.html_url}).`;
}

function renderCoverageComment({ results, summary, lcov }, run, repositoryUrl) {
  if (!/^[a-f0-9]{40}$/i.test(run.head_sha)) {
    throw new TypeError("A valid tested commit SHA is required.");
  }
  const testSummary = renderTestSummary(results, summary);
  const entries = Object.entries(summary).filter(([name]) => name !== "total");
  const files = readLineCoverage(lcov).map((file) => {
    const matches = entries.filter(([name]) => {
      const normalized = name.replace(/\\/g, "/");
      return normalized === file.path || normalized.endsWith(`/${file.path}`);
    });
    if (matches.length !== 1) {
      throw new Error(`Coverage summary does not uniquely match ${file.path}.`);
    }
    const [, entry] = matches[0];
    if (entry.lines.covered !== file.covered.length ||
        entry.lines.total !== file.covered.length + file.uncovered.length) {
      throw new Error(`LCOV and summary line counts disagree for ${file.path}.`);
    }
    const encodedPath = file.path.split("/").map((part) => encodeURIComponent(part)
      .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)).join("/");
    return { ...file, entry, url: `${repositoryUrl}/blob/${run.head_sha}/${encodedPath}` };
  });
  if (files.length !== entries.length) {
    throw new Error("LCOV and summary source-file counts disagree.");
  }
  const body = [
    COMMENT_MARKER,
    runStamp(run),
    testSummary,
    runSummary(run),
    "",
    "| Source file | Statements | Branches | Functions | Lines | Covered / total lines |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...files.map((file) => `| [${escapeMarkdown(file.path)}](${file.url}) | ${METRICS.map((metric) => `${file.entry[metric].pct.toFixed(2)}%`).join(" | ")} | ${file.covered.length} / ${file.entry.lines.total} |`),
    "",
    "<details>",
    "<summary>Covered and uncovered executable line numbers</summary>",
    "",
    ...files.flatMap((file) => [
      `### ${escapeMarkdown(file.path)}`,
      "",
      `**Covered (${file.covered.length}):** ${lineLinks(file.covered, file.url)}`,
      "",
      `**Uncovered (${file.uncovered.length}):** ${lineLinks(file.uncovered, file.url)}`,
      "",
    ]),
    "</details>",
    "",
    `Line links point to the tested PR head, not a moving branch. Full HTML/LCOV reports and JSON/JUnit test results are in the [unit-coverage artifact](${run.html_url}#artifacts).`,
  ].join("\n");
  if (body.length > 65_000) {
    throw new Error("Coverage comment exceeds the 65,000-character safety limit; no line details were dropped.");
  }
  return body;
}

async function findCoverageArtifact({ github, context }) {
  const run = context.payload.workflow_run;
  const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, {
    ...context.repo, run_id: run.id, per_page: 100,
  });
  const matches = artifacts.filter((artifact) =>
    artifact.name === `pr-coverage-${run.run_attempt}` && !artifact.expired);
  if (matches.length > 1) {
    throw new Error("Multiple coverage artifacts match this CI attempt.");
  }
  return matches[0]?.id ?? null;
}

async function publishCoverageComment({ github, context, core, readReports }) {
  const run = context.payload.workflow_run;
  if (run.event !== "pull_request" || run.status !== "completed" ||
      run.path !== ".github/workflows/ci.yml" || !run.head_repository) {
    core.notice("Only completed PR CI runs with an existing head repository can publish coverage.");
    return;
  }
  const matchesPull = (pull) => pull.state === "open" &&
    pull.base.ref === "master" &&
    pull.base.repo.full_name === `${context.repo.owner}/${context.repo.repo}` &&
    pull.head.repo?.id === run.head_repository.id &&
    pull.head.ref === run.head_branch && pull.head.sha === run.head_sha;
  const pulls = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
    ...context.repo, commit_sha: run.head_sha, per_page: 100,
  });
  const candidates = pulls.filter(matchesPull);
  if (candidates.length === 0) {
    core.notice("No open master PR matches this CI run's repository, branch, and head SHA.");
    return;
  }
  if (candidates.length !== 1) {
    throw new Error("Multiple open PRs match this CI run; no coverage comment was changed.");
  }
  const [pull] = candidates;
  const reports = await readReports();
  const body = reports
    ? renderCoverageComment(reports, run, `${context.serverUrl}/${run.head_repository.full_name}`)
    : [
      COMMENT_MARKER,
      runStamp(run),
      "## Unit tests and coverage",
      "",
      runSummary(run),
      "",
      "**Coverage unavailable:** this CI attempt did not provide downloadable coverage reports. Check the linked run for dependency, test-runner, reporting, or artifact errors; no passing coverage result is inferred.",
    ].join("\n");
  if (!reports) {
    core.warning("Coverage reports are unavailable; the PR comment will not claim a passing result.");
  }
  const comments = await github.paginate(github.rest.issues.listComments, {
    ...context.repo, issue_number: pull.number, per_page: 100,
  });
  const existing = comments.find((comment) => comment.user.type === "Bot" &&
    comment.user.login === "github-actions[bot]" && comment.body?.startsWith(COMMENT_MARKER));
  const { data: current } = await github.rest.pulls.get({ ...context.repo, pull_number: pull.number });
  const { data: currentRun } = await github.rest.actions.getWorkflowRun({ ...context.repo, run_id: run.id });
  if (!matchesPull(current) || current.base.sha !== pull.base.sha ||
      currentRun.run_attempt !== run.run_attempt || currentRun.status !== "completed") {
    core.notice("The PR or CI attempt changed while preparing coverage; its comment was not overwritten.");
    return;
  }
  const previousRun = existing?.body.match(/^<!-- coverage-run:(\d+):(\d+) -->$/m);
  if (previousRun && (Number(previousRun[1]) > run.id ||
      (Number(previousRun[1]) === run.id && Number(previousRun[2]) > run.run_attempt))) {
    core.notice("A newer CI result is already published; its coverage comment was not overwritten.");
    return;
  }
  if (existing?.body === body) {
    core.info("The PR coverage comment is already current.");
    return;
  }
  if (existing) {
    await github.rest.issues.updateComment({ ...context.repo, comment_id: existing.id, body });
  } else {
    await github.rest.issues.createComment({ ...context.repo, issue_number: pull.number, body });
  }
  core.info(`Published coverage for PR #${pull.number} at ${run.head_sha}.`);
}

module.exports = { COMMENT_MARKER, readLineCoverage, renderCoverageComment, findCoverageArtifact, publishCoverageComment };
