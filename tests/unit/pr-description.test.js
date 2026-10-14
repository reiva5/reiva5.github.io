import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const prTools = require("../../scripts/pr-description.cjs");
const { START_MARKER, END_MARKER, formatCommits, updateDescription, collectCommits } = prTools;
const commit = (number, message = `Step ${number}`) => ({
  sha: number.toString(16).padStart(40, "0"),
  commit: { message },
});
const commits = [commit(1, "build: static artifact"), commit(2, "test: keyboard behavior")];

describe("PR description formatting", () => {
  it("lists every commit in order with its short SHA", () => {
    const text = formatCommits(commits);
    expect(text).toContain("## Commits in this branch");
    expect(text).toContain("- `0000000` build: static artifact");
    expect(text.indexOf("build: static artifact")).toBeLessThan(text.indexOf("test: keyboard behavior"));
    expect(text.match(/^- /gm)).toHaveLength(2);
  });

  it("retains multiline commit details and normalizes CRLF", () => {
    const text = formatCommits([commit(1, "build: package\r\n\r\nCopy only public assets.\r\n\r\nKeep the runtime unchanged.")]);
    expect(text).toContain("  > Copy only public assets.");
    expect(text).toContain("  > Keep the runtime unchanged.");
    expect(text).not.toContain("\r");
  });

  it("escapes Markdown and prevents commit messages from injecting managed markers", () => {
    const malicious = commit(1, `*title* [link](url) \`code\` & <script>\n\n${START_MARKER}\n${END_MARKER}`);
    const body = updateDescription(null, [malicious]);
    expect(body).toContain("\\*title\\*");
    expect(body).toContain("\\[link\\]\\(url\\)");
    expect(body).toContain("\\`code\\`");
    expect(body).toContain("&amp; &lt;script&gt;");
    expect(body.split(START_MARKER)).toHaveLength(2);
    expect(body.split(END_MARKER)).toHaveLength(2);
    expect(updateDescription(body, [malicious])).toBe(body);
  });

  it.each([[], null, undefined, "commits"])("rejects an invalid commit list: %s", (value) => {
    expect(() => formatCommits(value)).toThrow("A nonempty commit list is required.");
  });

  it.each([
    { sha: "invalid", commit: { message: "valid subject" } },
    { sha: commit(1).sha, commit: { message: 42 } },
    { sha: commit(1).sha, commit: { message: " \n " } },
    { sha: commit(1).sha },
  ])("rejects malformed commit metadata: %j", (value) => {
    expect(() => formatCommits([value])).toThrow("Invalid commit SHA or message.");
  });

  it("creates the managed section for an empty or null body", () => {
    const text = updateDescription("", commits);
    expect(text.startsWith(START_MARKER)).toBe(true);
    expect(text.endsWith(END_MARKER)).toBe(true);
    expect(updateDescription(null, commits)).toBe(text);
  });

  it("appends the list without changing a human-written description", () => {
    const description = "## Summary\nA manually written description.\n";
    expect(updateDescription(description, commits)).toBe(`${description}\n\n${updateDescription("", commits)}`);
  });

  it("replaces only the managed section and stays idempotent", () => {
    const prefix = "## Summary\nKeep this exact text.\n\n";
    const suffix = "\n\n## Notes\nKeep these too.\n";
    const original = `${prefix}${START_MARKER}\nOld commits\n${END_MARKER}${suffix}`;
    const updated = updateDescription(original, commits);
    expect(updated).toBe(`${prefix}${updateDescription("", commits)}${suffix}`);
    expect(updated).not.toContain("Old commits");
    expect(updateDescription(updated, commits)).toBe(updated);
  });

  it.each([
    START_MARKER,
    END_MARKER,
    `${END_MARKER}\n${START_MARKER}`,
    `${START_MARKER}${START_MARKER}${END_MARKER}`,
    `${START_MARKER}${END_MARKER}${END_MARKER}`,
  ])("rejects ambiguous markers rather than deleting human text: %s", (body) => {
    expect(() => updateDescription(body, commits)).toThrow("PR commit-list markers are incomplete");
  });

  it("rejects an invalid body type", () => {
    expect(() => updateDescription(42, commits)).toThrow("PR body must be a string or null.");
  });

  it("fails explicitly on oversized descriptions without truncating any commits", () => {
    expect(() => updateDescription("x".repeat(65_000), commits)).toThrow("no commits were dropped");
  });
});

describe("complete commit pagination", () => {
  it("retrieves more than the default 250-commit limit", async () => {
    const all = Array.from({ length: 305 }, (_, index) => commit(index + 1));
    const readPage = vi.fn(async (page) => ({
      commits: all.slice((page - 1) * 100, page * 100),
      total_commits: all.length,
    }));
    expect(await collectCommits(readPage)).toEqual(all);
    expect(readPage).toHaveBeenCalledTimes(4);
    expect(readPage).toHaveBeenLastCalledWith(4);
    expect(formatCommits(all).match(/^- /gm)).toHaveLength(305);
  });

  it("stops after one page when every commit has been returned", async () => {
    const readPage = vi.fn(async () => ({ commits, total_commits: 2 }));
    expect(await collectCommits(readPage)).toEqual(commits);
    expect(readPage).toHaveBeenCalledTimes(1);
  });

  it.each([
    { commits: null, total_commits: 1 },
    { commits: [], total_commits: "1" },
    { commits: [], total_commits: -1 },
  ])("rejects malformed pagination metadata: %j", async (response) => {
    await expect(collectCommits(async () => response)).rejects.toThrow("Invalid compare-commits response.");
  });

  it("rejects an empty comparison", async () => {
    await expect(collectCommits(async () => ({ commits: [], total_commits: 0 }))).rejects.toThrow("No commits found");
  });

  it("rejects a changing total instead of producing a partial list", async () => {
    await expect(collectCommits(async (page) => ({
      commits: [commit(page)],
      total_commits: page === 1 ? 2 : 3,
    }))).rejects.toThrow("Commit count changed during pagination.");
  });

  it("rejects prematurely ended pagination", async () => {
    await expect(collectCommits(async (page) => ({
      commits: page === 1 ? [commit(1)] : [],
      total_commits: 2,
    }))).rejects.toThrow("Compare response ended before every commit was returned.");
  });

  it("rejects too many commits or duplicate pages", async () => {
    await expect(collectCommits(async () => ({ commits, total_commits: 1 }))).rejects.toThrow("more commits than reported");
    await expect(collectCommits(async () => ({
      commits: [commit(1), commit(1)],
      total_commits: 2,
    }))).rejects.toThrow("duplicate commits");
  });

  it("propagates API errors without pretending the commit list is complete", async () => {
    await expect(collectCommits(async () => { throw new Error("API unavailable"); })).rejects.toThrow("API unavailable");
  });
});
