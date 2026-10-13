const MIN_COVERAGE = 90;
const METRICS = ["statements", "branches", "functions", "lines"];

function percentages(entry) {
  return Object.fromEntries(METRICS.map((metric) => {
    const value = entry?.[metric]?.pct;
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new TypeError(`Invalid coverage percentage for ${metric}.`);
    }
    return [metric, value];
  }));
}

function readCoverage(summary) {
  const total = percentages(summary.total);
  const files = Object.entries(summary).filter(([name]) => name !== "total");
  if (files.length === 0) {
    throw new Error("Coverage report contains no source files.");
  }
  const values = files.map(([, entry]) => percentages(entry));
  const minimums = Object.fromEntries(METRICS.map((metric) => [
    metric,
    Math.min(...values.map((entry) => entry[metric])),
  ]));
  return { total, minimums, minimum: Math.min(...Object.values(minimums)) };
}

function renderCoverageBadge(summary) {
  const { minimum } = readCoverage(summary);
  const percentage = `${minimum.toFixed(2)}%`;
  const color = minimum >= MIN_COVERAGE ? "#3d5f58" : "#b33d38";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="174" height="24" role="img" aria-label="minimum coverage: ${percentage}">
  <title>Lowest source-file coverage across all four metrics: ${percentage}</title>
  <rect width="174" height="24" fill="#10201d"/>
  <rect x="104" width="70" height="24" fill="${color}"/>
  <g fill="#f7f7f2" font-family="Verdana, sans-serif" font-size="11" text-anchor="middle">
    <text x="52" y="16">min. coverage</text>
    <text x="139" y="16">${percentage}</text>
  </g>
</svg>
`;
}

function renderTestSummary(results, summary) {
  const { numTotalTests, numPassedTests, numFailedTests } = results;
  const counts = [numTotalTests, numPassedTests, numFailedTests];
  if (counts.some((count) => !Number.isInteger(count) || count < 0) ||
      numTotalTests === 0 || numPassedTests + numFailedTests > numTotalTests) {
    throw new TypeError("Invalid unit test counts.");
  }
  const { total, minimums } = readCoverage(summary);
  const skipped = numTotalTests - numPassedTests - numFailedTests;
  return [
    "## Unit tests and coverage",
    "",
    `Assertions: **${numPassedTests}/${numTotalTests} passed**, ${numFailedTests} failed, ${skipped} skipped.`,
    "",
    `Required coverage: **${MIN_COVERAGE}% per source file for every metric**.`,
    "",
    "| Metric | Overall | Lowest source file | Gate |",
    "| --- | ---: | ---: | --- |",
    ...METRICS.map((metric) => `| ${metric} | ${total[metric].toFixed(2)}% | ${minimums[metric].toFixed(2)}% | ${minimums[metric] >= MIN_COVERAGE ? "PASS" : "FAIL"} |`),
    "",
  ].join("\n");
}

module.exports = { MIN_COVERAGE, METRICS, readCoverage, renderCoverageBadge, renderTestSummary };
