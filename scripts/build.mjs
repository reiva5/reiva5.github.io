import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Script } from "node:vm";
import { escapeHtml, renderDocument, renderPage, renderProjectCards } from "./projects.mjs";
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
const projectList = renderProjectCards(projects);
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
    const directory = join(output, "projects", project.slug);
    await mkdir(join(directory, "diagrams"), { recursive: true });
    const sourcePath = join(root, "projects", project.slug, "tdd.md");
    const source = await readFile(sourcePath, "utf8");
    const { html, toc } = await renderDocument(source, async (diagram, index) => {
      const svg = await renderDiagram(diagram, index);
      await writeFile(join(directory, "diagrams", `diagram-${index}.svg`), svg);
      return `./diagrams/diagram-${index}.svg`;
    });
    await copyFile(sourcePath, join(directory, "tdd.md"));
    await writeFile(join(directory, "index.html"), renderPage(template, {
      title: `${project.title} - TDD`,
      description: project.summary,
      breadcrumb: "project / technical design",
      base: "../../",
      body: `<header class="page-heading document-heading">
        <p class="eyebrow"><span class="eyebrow-line" aria-hidden="true"></span>Project / Technical design document</p>
        <h1>${escapeHtml(project.title)}</h1>
        <p class="page-description"><span class="project-status project-status-${project.status.toLowerCase()}">${project.status}</span> Technical design and implementation reference.</p>
        <div class="document-actions">
          <a class="profile-link" href="../../project.html">Back to Project</a>
          <a class="profile-link" href="./tdd.md" download>Download Markdown</a>
        </div>
      </header>${toc}<article class="markdown-body" lang="id" aria-label="Technical design document">${html}</article>`,
    }));
  }
});

console.log(`Built ${assets.length} static assets and ${projects.length} project document(s) in dist.`);
