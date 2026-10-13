import { appendFile, readFile, writeFile } from "node:fs/promises";
import coverageTools from "./coverage-badge.cjs";

const coverage = JSON.parse(await readFile(new URL("../coverage/coverage-summary.json", import.meta.url), "utf8"));
const tests = JSON.parse(await readFile(new URL("../coverage/unit-results.json", import.meta.url), "utf8"));
const summary = coverageTools.renderTestSummary(tests, coverage);

await writeFile(new URL("../coverage/coverage.svg", import.meta.url), coverageTools.renderCoverageBadge(coverage));
console.log(summary);

if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}
