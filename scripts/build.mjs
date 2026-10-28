import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Script } from "node:vm";
import { renderPage, renderProjectCards } from "./projects.mjs";
import { buildProjectDocuments, projectIterations } from "./project-documents.mjs";
import { withDiagramRenderer } from "./diagrams.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "dist");
const cardScripts = [
  "ProfileDataError.js", "data.js", "ProfileCard.js", "SnapshotCard.js",
  "LinkedInCard.js", "CodeforcesCard.js", "LeetCodeCard.js", "KaggleCard.js", "KtomCard.js",
].map((filename) => join("js", "card", filename));
const resumeScripts = ["index.js", "cards.js"]
  .map((filename) => join("js", "resume", filename));
const pageScripts = [
  join("js", "shared", "sidebar.js"), join("js", "home", "index.js"), join("js", "project", "index.js"),
];
const snapshots = ["linkedin", "leetcode", "kaggle", "ktom"]
  .map((platform) => join("data", "resume", `${platform}.json`));
const logos = [
  "linkedin.png", "codeforces.svg", "leetcode.svg", "kaggle.ico", "ktom.png",
  "SIMPLE-ICONS-LICENSE.txt",
].map((filename) => join("assets", "logos", filename));
const assets = [
  "index.html", "resume.html", "styles.css", ".nojekyll",
  ...cardScripts, ...resumeScripts, ...pageScripts, ...snapshots, ...logos,
];

await Promise.all(assets.filter((asset) => asset.endsWith(".js")).map(async (asset) => {
  new Script(await readFile(join(root, asset), "utf8"), { filename: asset });
}));

await rm(output, { recursive: true, force: true });
await mkdir(output);
await mkdir(join(output, "js", "card"), { recursive: true });
await mkdir(join(output, "js", "home"), { recursive: true });
await mkdir(join(output, "js", "project"), { recursive: true });
await mkdir(join(output, "js", "resume"), { recursive: true });
await mkdir(join(output, "js", "shared"), { recursive: true });
await mkdir(join(output, "data", "resume"), { recursive: true });
await mkdir(join(output, "assets", "logos"), { recursive: true });
await Promise.all(assets.map((asset) => copyFile(join(root, asset), join(output, asset))));

const projects = JSON.parse(await readFile(join(root, "data", "projects.json"), "utf8"));
const template = await readFile(join(root, "templates", "project.html"), "utf8");
const projectList = renderProjectCards(projects.map((project) => ({
  ...project, latestIteration: projectIterations(project).at(-1).number,
})));
await writeFile(join(output, "project.html"), renderPage(template, {
  title: "Project",
  description: "Projects, their current status, and technical design documents by reiva5.",
  breadcrumb: "project",
  body: `<header class="page-heading">
    <p class="eyebrow"><span class="eyebrow-line" aria-hidden="true"></span>03 / Project</p>
    <h1>Project<span class="title-cursor" aria-hidden="true">_</span></h1>
    <p class="page-description">Ideas, designs, and the work that brings them to life.</p>
  </header><section aria-label="Project list">${projectList}</section>`,
}));

await withDiagramRenderer(async (renderDiagram) => {
  for (const project of projects) {
    await buildProjectDocuments({ project, template, root, output, renderDiagram });
  }
});

console.log(`Built ${assets.length} static assets and ${projects.length} project document(s) in dist.`);
