import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Script } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "dist");
const cardScripts = [
  "profile-data-error.js", "profile-data.js", "profile-card.js", "snapshot-card.js",
  "linkedin-card.js", "codeforces-card.js", "leetcode-card.js", "kaggle-card.js", "ktom-card.js",
].map((filename) => join("resume-cards", filename));
const snapshots = ["linkedin", "leetcode", "kaggle", "ktom"]
  .map((platform) => join("data", "resume", `${platform}.json`));
const logos = [
  "linkedin.png", "codeforces.svg", "leetcode.svg", "kaggle.ico", "ktom.png",
  "SIMPLE-ICONS-LICENSE.txt",
].map((filename) => join("assets", "logos", filename));
const assets = [
  "index.html", "resume.html", "styles.css", "script.js", "resume.js", "resume-cards.js", ".nojekyll",
  ...cardScripts, ...snapshots, ...logos,
];

await Promise.all(assets.filter((asset) => asset.endsWith(".js")).map(async (asset) => {
  new Script(await readFile(join(root, asset), "utf8"), { filename: asset });
}));

await rm(output, { recursive: true, force: true });
await mkdir(output);
await mkdir(join(output, "resume-cards"), { recursive: true });
await mkdir(join(output, "data", "resume"), { recursive: true });
await mkdir(join(output, "assets", "logos"), { recursive: true });
await Promise.all(assets.map((asset) => copyFile(join(root, asset), join(output, asset))));

console.log(`Built ${assets.length} static assets in dist.`);
