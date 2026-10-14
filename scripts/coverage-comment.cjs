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
    testSummary,
    `CI result: **${escapeMarkdown(run.conclusion)}**. Tested commit: [\`${run.head_sha.slice(0, 7)}\`](${run.html_url}).`,
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

module.exports = { COMMENT_MARKER, readLineCoverage, renderCoverageComment };
