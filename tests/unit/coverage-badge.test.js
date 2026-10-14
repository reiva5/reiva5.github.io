import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const coverageTools = require("../../scripts/coverage-badge.cjs");
const { MIN_COVERAGE, METRICS, readCoverage, renderCoverageBadge, renderTestSummary } = coverageTools;
const entry = (value) => Object.fromEntries(METRICS.map((metric) => [metric, { pct: value }]));
const report = (value = 100) => ({ total: entry(value), "script.js": entry(value) });
const results = { numTotalTests: 23, numPassedTests: 23, numFailedTests: 0 };

describe("coverage reporting", () => {
  it("uses the same 90 percent threshold for the configuration and reports", () => {
    expect(MIN_COVERAGE).toBe(90);
    expect(METRICS).toEqual(["statements", "branches", "functions", "lines"]);
  });

  it("reads all four metrics from a nonempty source report", () => {
    expect(readCoverage(report())).toEqual({
      total: Object.fromEntries(METRICS.map((metric) => [metric, 100])),
      minimums: Object.fromEntries(METRICS.map((metric) => [metric, 100])),
      minimum: 100,
    });
  });

  it("shows the worst source-file metric instead of hiding it behind an aggregate", () => {
    const summary = report(99);
    summary["helper.cjs"] = entry(95);
    summary["helper.cjs"].branches.pct = 75.5;
    const coverage = readCoverage(summary);
    expect(coverage.total.branches).toBe(99);
    expect(coverage.minimums.branches).toBe(75.5);
    expect(coverage.minimum).toBe(75.5);
    expect(renderCoverageBadge(summary)).toContain("75.50%");
    expect(renderCoverageBadge(summary)).toContain("#b33d38");
    expect(renderTestSummary(results, summary)).toContain("| branches | 99.00% | 75.50% | FAIL |");
  });

  it("accepts exactly 90 percent and emits a green accessible SVG", () => {
    const svg = renderCoverageBadge(report(90));
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="minimum coverage: 90.00%"');
    expect(svg).toContain("#3d5f58");
  });

  it("renders a failing badge for zero coverage", () => {
    const svg = renderCoverageBadge(report(0));
    expect(svg).toContain("0.00%");
    expect(svg).toContain("#b33d38");
  });

  it.each([NaN, Infinity, -1, 101, "100", "Unknown", undefined])("rejects an invalid percentage: %s", (value) => {
    const summary = report();
    summary.total.lines.pct = value;
    expect(() => renderCoverageBadge(summary)).toThrow("Invalid coverage percentage for lines.");
  });

  it("rejects missing metrics or a missing total rather than reporting a passing badge", () => {
    const summary = report();
    delete summary["script.js"].branches;
    expect(() => readCoverage(summary)).toThrow("Invalid coverage percentage for branches.");
    expect(() => readCoverage({ "script.js": entry(100) })).toThrow("Invalid coverage percentage");
  });

  it("rejects a report containing no source files", () => {
    expect(() => readCoverage({ total: entry(100) })).toThrow("Coverage report contains no source files.");
  });

  it("reports assertion totals and the per-file gate", () => {
    const summary = renderTestSummary(results, report());
    expect(summary).toContain("23/23 passed");
    expect(summary).toContain("0 failed, 0 skipped");
    expect(summary).toContain("90% per source file for every metric");
    for (const metric of METRICS) {
      expect(summary).toContain(`| ${metric} | 100.00% | 100.00% | PASS |`);
    }
  });

  it("reports failed and skipped assertions without describing them as passed", () => {
    const summary = renderTestSummary(
      { numTotalTests: 23, numPassedTests: 20, numFailedTests: 2 },
      report(),
    );
    expect(summary).toContain("20/23 passed");
    expect(summary).toContain("2 failed, 1 skipped");
  });

  it.each([
    { numTotalTests: 0, numPassedTests: 0, numFailedTests: 0 },
    { numTotalTests: 1, numPassedTests: 2, numFailedTests: 0 },
    { numTotalTests: 1, numPassedTests: 0, numFailedTests: 2 },
    { numTotalTests: 1, numPassedTests: -1, numFailedTests: 0 },
    { numTotalTests: 1.5, numPassedTests: 1, numFailedTests: 0 },
    { numTotalTests: 1, numPassedTests: 1, numFailedTests: undefined },
  ])("rejects invalid assertion counts: %j", (counts) => {
    expect(() => renderTestSummary(counts, report())).toThrow("Invalid unit test counts.");
  });
});
