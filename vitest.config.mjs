import { defineConfig } from "vitest/config";
import coverageTools from "./scripts/coverage-badge.cjs";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.js"],
    environment: "node",
    allowOnly: false,
    reporters: ["default", "junit", "json"],
    outputFile: {
      junit: "coverage/unit-results.xml",
      json: "coverage/unit-results.json",
    },
    coverage: {
      provider: "v8",
      include: ["*.js", "resume-cards/*.js", "scripts/*.cjs"],
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      reportOnFailure: true,
      thresholds: {
        perFile: true,
        ...Object.fromEntries(coverageTools.METRICS.map((metric) => [metric, coverageTools.MIN_COVERAGE])),
      },
    },
  },
});
