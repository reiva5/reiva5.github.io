const START_MARKER = "<!-- branch-commits:start -->";
const END_MARKER = "<!-- branch-commits:end -->";

function escapeMarkdown(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/[\\`*_{}[\]()#!|]/g, "\\$&");
}

function formatCommits(commits) {
  if (!Array.isArray(commits) || commits.length === 0) {
    throw new TypeError("A nonempty commit list is required.");
  }
  const items = commits.map(({ sha, commit }) => {
    if (!/^[a-f0-9]{40}$/i.test(sha) || typeof commit?.message !== "string" || !commit.message.trim()) {
      throw new TypeError("Invalid commit SHA or message.");
    }
    const [subject, ...lines] = commit.message.replace(/\r\n/g, "\n").trim().split("\n");
    const details = lines.join("\n").trim();
    const item = `- \`${sha.slice(0, 7)}\` ${escapeMarkdown(subject)}`;
    return details
      ? `${item}\n\n${details.split("\n").map((line) => `  > ${escapeMarkdown(line)}`).join("\n")}`
      : item;
  });
  return `## Commits in this branch\n\n${items.join("\n\n")}`;
}

function updateDescription(body, commits) {
  const text = body === null ? "" : body;
  if (typeof text !== "string") {
    throw new TypeError("PR body must be a string or null.");
  }
  const start = text.indexOf(START_MARKER);
  const end = text.indexOf(END_MARKER);
  if ((start === -1) !== (end === -1) || end < start ||
      text.lastIndexOf(START_MARKER) !== start || text.lastIndexOf(END_MARKER) !== end) {
    throw new Error("PR commit-list markers are incomplete, reversed, or duplicated.");
  }
  const block = `${START_MARKER}\n${formatCommits(commits)}\n${END_MARKER}`;
  const updated = start === -1
    ? `${text}${text ? "\n\n" : ""}${block}`
    : `${text.slice(0, start)}${block}${text.slice(end + END_MARKER.length)}`;
  if (updated.length > 65_000) {
    throw new Error("PR description exceeds the 65,000-character safety limit; no commits were dropped.");
  }
  return updated;
}

async function collectCommits(readPage) {
  const commits = [];
  let expected;
  for (let page = 1; ; page += 1) {
    const { commits: batch, total_commits: total } = await readPage(page);
    if (!Array.isArray(batch) || !Number.isInteger(total) || total < 0) {
      throw new TypeError("Invalid compare-commits response.");
    }
    if (page === 1) {
      expected = total;
    } else if (total !== expected) {
      throw new Error("Commit count changed during pagination.");
    }
    if (batch.length === 0 && commits.length < expected) {
      throw new Error("Compare response ended before every commit was returned.");
    }
    commits.push(...batch);
    if (commits.length > expected) {
      throw new Error("Compare response returned more commits than reported.");
    }
    if (commits.length === expected) {
      break;
    }
  }
  if (commits.length === 0) {
    throw new Error("No commits found between the PR base and head.");
  }
  if (new Set(commits.map(({ sha }) => sha)).size !== commits.length) {
    throw new Error("Compare response contains duplicate commits.");
  }
  return commits;
}

module.exports = { START_MARKER, END_MARKER, escapeMarkdown, formatCommits, updateDescription, collectCommits };
