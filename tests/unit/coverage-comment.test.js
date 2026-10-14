import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const coverageTools = require("../../scripts/coverage-badge.cjs");
const commentTools = require("../../scripts/coverage-comment.cjs");
const { METRICS } = coverageTools;
const { COMMENT_MARKER, readLineCoverage, renderCoverageComment } = commentTools;
const repositoryUrl = "https://github.com/reiva5/reiva5.github.io";
const run = {
  head_sha: "a".repeat(40),
  html_url: `${repositoryUrl}/actions/runs/123`,
  conclusion: "success",
};
const entry = (covered = 3, total = 4) => Object.fromEntries(METRICS.map((metric) => [
  metric, { covered, total, pct: total === 0 ? 100 : covered / total * 100 },
]));
const record = (path = "js/home/index.js", lines = ["DA:1,1", "DA:2,2", "DA:4,0", "DA:6,1"]) =>
  ["TN:", `SF:${path}`, ...lines, "LF:4", "LH:3", "end_of_record", ""].join("\n");
const reports = () => ({
  results: { numTotalTests: 12, numPassedTests: 12, numFailedTests: 0 },
  summary: { total: entry(), "/home/runner/work/site/site/js/home/index.js": entry() },
  lcov: record(),
});
const render = (value = reports(), metadata = run) => renderCoverageComment(value, metadata, repositoryUrl);

describe("LCOV executable lines", () => {
  it("reads hit counts, ignores function/branch metadata, and sorts source files", () => {
    expect(readLineCoverage(`${record("scripts/helper.cjs")}${record()}`)).toEqual([
      { path: "js/home/index.js", covered: [1, 2, 6], uncovered: [4] },
      { path: "scripts/helper.cjs", covered: [1, 2, 6], uncovered: [4] },
    ]);
    expect(readLineCoverage(record("js/home/index.js", [
      "FN:1,initialize", "BRDA:1,0,0,0", "DA:3,0,checksum", "DA:1,1",
    ]))[0]).toEqual({ path: "js/home/index.js", covered: [1], uncovered: [3] });
  });

  it("normalizes Windows source paths and CRLF records", () => {
    expect(readLineCoverage(record("js\\home\\index.js").replace(/\n/g, "\r\n"))[0].path)
      .toBe("js/home/index.js");
  });

  it.each([null, undefined, "", " \n "])("rejects a missing LCOV report: %s", (value) => {
    expect(() => readLineCoverage(value)).toThrow("A nonempty LCOV report is required.");
  });

  it.each(["/etc/file.js", "C:\\site\\file.js", "../file.js", "js/../file.js", "./file.js", "js//file.js", "", "js/\u0000.js"])(
    "rejects a non-repository source path: %s", (path) => {
      expect(() => readLineCoverage(record(path))).toThrow("LCOV source paths must be repository-relative.");
    },
  );

  it.each([
    "DA:1,1\nend_of_record",
    record("file.js", ["DA:0,1"]),
    record("file.js", ["DA:1,-1"]),
    record("file.js", ["DA:1,1.5"]),
    record("file.js", ["DA:no,1"]),
    record("file.js", ["DA:9007199254740992,1"]),
    record("file.js", ["DA:1,9007199254740992"]),
  ])("rejects malformed executable-line data: %s", (value) => {
    expect(() => readLineCoverage(value)).toThrow("Invalid LCOV line coverage.");
  });

  it("rejects duplicate files, duplicate lines, and incomplete records", () => {
    expect(() => readLineCoverage(record() + record())).toThrow("duplicate source files");
    expect(() => readLineCoverage(record("file.js", ["DA:1,1", "DA:1,0"]))).toThrow("duplicate line numbers");
    expect(() => readLineCoverage("SF:first.js\nSF:second.js")).toThrow("source record is incomplete");
    expect(() => readLineCoverage("end_of_record")).toThrow("source record is missing");
    expect(() => readLineCoverage("SF:file.js\nDA:1,1")).toThrow("incomplete or contains no source files");
    expect(() => readLineCoverage("TN:")).toThrow("incomplete or contains no source files");
  });
});

describe("PR coverage comment formatting", () => {
  it("includes test results, all four coverage metrics, and covered/total lines", () => {
    const body = render();
    expect(body.startsWith(COMMENT_MARKER)).toBe(true);
    expect(body).toContain("12/12 passed");
    expect(body).toContain("90% per source file for every metric");
    expect(body).toContain("CI result: **success**.");
    expect(body).toContain("[`aaaaaaa`](" + run.html_url + ")");
    for (const metric of METRICS) {
      expect(body).toContain(`| ${metric} | 75.00% | 75.00% | FAIL |`);
    }
    expect(body).toContain("| 75.00% | 75.00% | 75.00% | 75.00% | 3 / 4 |");
    expect(body).toContain(`[unit-coverage artifact](${run.html_url}#artifacts)`);
  });

  it("links exact covered and uncovered ranges at the tested SHA", () => {
    const body = render();
    const source = `${repositoryUrl}/blob/${run.head_sha}/js/home/index.js`;
    expect(body).toContain(`**Covered (3):** [1-2](${source}#L1-L2), [6](${source}#L6)`);
    expect(body).toContain(`**Uncovered (1):** [4](${source}#L4)`);
    expect(body).not.toContain("/blob/master/");
    expect(body).toContain("not a moving branch");
  });

  it("groups out-of-order lines and handles fully covered, uncovered, and empty files", () => {
    for (const [lines, covered, total, expected] of [
      [["DA:3,1", "DA:1,1", "DA:2,1"], 3, 3, "**Uncovered (0):** None"],
      [["DA:2,0", "DA:1,0"], 0, 2, "**Covered (0):** None"],
      [[], 0, 0, "**Uncovered (0):** None"],
    ]) {
      const value = reports();
      value.summary = { total: entry(covered, total), "js/home/index.js": entry(covered, total) };
      value.lcov = record("js/home/index.js", lines);
      const body = render(value);
      expect(body).toContain(expected);
      expect(body).toContain(`| ${covered} / ${total} |`);
      if (covered === 3) {
        expect(body).toContain(`#L1-L3)`);
      }
    }
  });

  it("matches Windows absolute summary paths with relative LCOV source paths", () => {
    const value = reports();
    value.summary = { total: entry(), "C:\\checkout\\js\\home\\index.js": entry() };
    value.lcov = record("js\\home\\index.js");
    expect(render(value)).toContain("| 3 / 4 |");
  });

  it("does not hide failed or skipped assertions or a failing CI result", () => {
    const value = reports();
    value.results.numPassedTests = 9;
    value.results.numFailedTests = 2;
    const body = render(value, { ...run, conclusion: "failure" });
    expect(body).toContain("9/12 passed");
    expect(body).toContain("2 failed, 1 skipped");
    expect(body).toContain("CI result: **failure**.");
  });

  it("escapes source names and encodes URL segments rather than injecting Markdown", () => {
    const path = "js/[link](x)!' &<tag>*.js";
    const value = reports();
    value.summary = { total: entry(), [path]: entry() };
    value.lcov = record(path);
    const body = render(value);
    expect(body).toContain("js/\\[link\\]\\(x\\)\\!' &amp;&lt;tag&gt;\\*.js");
    expect(body).toContain("js/%5Blink%5D%28x%29%21%27%20%26%3Ctag%3E%2A.js#L1-L2");
    expect(body).not.toContain("<tag>");
    expect(body.split(COMMENT_MARKER)).toHaveLength(2);
  });

  it("rejects absent, ambiguous, or mismatched source entries", () => {
    const value = reports();
    value.lcov = record("missing.js");
    expect(() => render(value)).toThrow("does not uniquely match missing.js");
    value.lcov = record();
    value.summary["js/home/index.js"] = entry();
    expect(() => render(value)).toThrow("does not uniquely match js/home/index.js");
    delete value.summary["js/home/index.js"];
    value.summary["other.js"] = entry();
    expect(() => render(value)).toThrow("source-file counts disagree");
  });

  it.each([{ covered: 2, total: 4 }, { covered: 3, total: 5 }])(
    "rejects disagreement between LCOV and summary line counts: %j", (counts) => {
      const value = reports();
      Object.assign(value.summary["/home/runner/work/site/site/js/home/index.js"].lines, counts);
      expect(() => render(value)).toThrow("LCOV and summary line counts disagree");
    },
  );

  it("rejects malformed test results, coverage percentages, and tested SHAs", () => {
    const value = reports();
    expect(() => render(value, { ...run, head_sha: "not-a-sha" })).toThrow("valid tested commit SHA");
    value.results.numTotalTests = 0;
    expect(() => render(value)).toThrow("Invalid unit test counts");
    value.results.numTotalTests = 12;
    value.summary.total.lines.pct = undefined;
    expect(() => render(value)).toThrow("Invalid coverage percentage");
  });

  it("fails explicitly when complete line details cannot fit in one comment", () => {
    const path = `js/${"a".repeat(65_000)}.js`;
    const value = reports();
    value.summary = { total: entry(), [path]: entry() };
    value.lcov = record(path);
    expect(() => render(value)).toThrow("no line details were dropped");
  });
});
