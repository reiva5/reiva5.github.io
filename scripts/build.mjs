import { copyFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "dist");
const snapshots = ["linkedin", "leetcode", "kaggle", "ktom"]
  .map((platform) => join("data", "resume", `${platform}.json`));
const assets = [
  "index.html", "resume.html", "styles.css", "script.js", "resume.js", "resume-cards.js", ".nojekyll",
  ...snapshots,
];

await rm(output, { recursive: true, force: true });
await mkdir(output);
await mkdir(join(output, "data", "resume"), { recursive: true });
await Promise.all(assets.map((asset) => copyFile(join(root, asset), join(output, asset))));

console.log(`Built ${assets.length} static assets in dist.`);
