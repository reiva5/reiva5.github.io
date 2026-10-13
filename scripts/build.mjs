import { copyFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "dist");
const assets = ["index.html", "resume.html", "styles.css", "script.js", "resume.js", ".nojekyll"];

await rm(output, { recursive: true, force: true });
await mkdir(output);
await Promise.all(assets.map((asset) => copyFile(join(root, asset), join(output, asset))));

console.log(`Built ${assets.length} static assets in dist.`);
