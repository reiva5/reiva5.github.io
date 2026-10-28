import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { escapeHtml, renderDocument, renderPage } from "./projects.mjs";

export function projectIterations(project) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
    throw new Error(`Invalid project slug: ${project.slug}`);
  }
  if (!Array.isArray(project.iterations) || project.iterations.length === 0) {
    throw new Error(`Missing iterations: ${project.slug}`);
  }
  const numbers = new Set();
  for (const iteration of project.iterations) {
    if (!Number.isSafeInteger(iteration.number) || iteration.number < 1 || numbers.has(iteration.number)) {
      throw new Error(`Invalid or duplicate iteration: ${project.slug}`);
    }
    numbers.add(iteration.number);
    if (!Array.isArray(iteration.languages) || iteration.languages.length === 0) {
      throw new Error(`Missing languages: ${project.slug} iteration-${iteration.number}`);
    }
    const codes = new Set();
    for (const language of iteration.languages) {
      if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(language.code) || codes.has(language.code)) {
        throw new Error(`Invalid or duplicate language: ${project.slug}`);
      }
      if (typeof language.label !== "string" || !language.label.trim()) {
        throw new Error(`Missing language label: ${project.slug}`);
      }
      if (typeof language.source !== "string"
        || !/^[a-z0-9][a-z0-9._/-]*\.md$/.test(language.source)
        || language.source.split("/").some((part) => !part || part === "." || part === "..")) {
        throw new Error(`Invalid document source: ${project.slug}`);
      }
      codes.add(language.code);
    }
    if (!codes.has(iteration.defaultLanguage)) {
      throw new Error(`Unavailable default language: ${project.slug} iteration-${iteration.number}`);
    }
  }
  return [...project.iterations].sort((a, b) => a.number - b.number);
}

export function documentURL(project, iteration, code) {
  return `/projects/${project.slug}/iteration-${iteration.number}/${code}/`;
}

export function renderDocumentNavigation(project, iterations, current, code) {
  const languages = current.languages.map((language) =>
    `<li><a href="${documentURL(project, current, language.code)}" lang="${language.code}" hreflang="${language.code}"${
      language.code === code ? ' aria-current="page"' : ""
    }>${escapeHtml(language.label)}</a></li>`).join("");
  const iterationLink = (iteration, relation = "") => {
    const language = iteration.languages.find((item) => item.code === code)
      || iteration.languages.find((item) => item.code === iteration.defaultLanguage);
    const fallback = language.code === code ? "" : ` (${escapeHtml(language.label)})`;
    return `<a href="${documentURL(project, iteration, language.code)}"${relation ? ` rel="${relation}"` : ""}${
      iteration.number === current.number ? ' aria-current="page"' : ""
    }>${relation === "prev" ? "Previous: " : relation === "next" ? "Next: " : ""}iteration-${iteration.number}${fallback}</a>`;
  };
  const index = iterations.indexOf(current);
  return `<div class="document-navigation">
    <nav aria-label="Document language"><h2>Language</h2><ul>${languages}</ul></nav>
    <nav aria-label="Document iteration"><h2>Iteration</h2>
      <ul>${iterations.map((iteration) => `<li>${iterationLink(iteration)}</li>`).join("")}</ul>
      <div class="iteration-actions">${
        index > 0 ? iterationLink(iterations[index - 1], "prev") : '<span aria-disabled="true">Previous iteration unavailable</span>'
      }${
        index < iterations.length - 1 ? iterationLink(iterations[index + 1], "next") : '<span aria-disabled="true">Next iteration unavailable</span>'
      }</div>
      <p>Only published iterations and translations are listed. If a translation is unavailable, the target language is shown.</p>
    </nav>
  </div>`;
}

export async function buildProjectDocuments({ project, template, root, output, renderDiagram }) {
  const iterations = projectIterations(project);
  const latest = iterations.at(-1);
  const legacyDirectory = join(output, "projects", project.slug);
  for (const iteration of iterations) {
    for (const language of iteration.languages) {
      const url = documentURL(project, iteration, language.code);
      const directory = join(output, "projects", project.slug, `iteration-${iteration.number}`, language.code);
      const sourcePath = join(root, "projects", project.slug, ...language.source.split("/"));
      const source = await readFile(sourcePath, "utf8");
      await mkdir(join(directory, "diagrams"), { recursive: true });
      const { html, toc } = await renderDocument(source, async (diagram, index) => {
        await writeFile(join(directory, "diagrams", `diagram-${index}.svg`), await renderDiagram(diagram, index));
        return `${url}diagrams/diagram-${index}.svg`;
      });
      await copyFile(sourcePath, join(directory, "tdd.md"));
      const navigation = renderDocumentNavigation(project, iterations, iteration, language.code);
      const page = (base) => renderPage(template, {
        title: `${project.title} - TDD`,
        description: project.summary,
        breadcrumb: `project / iteration-${iteration.number} / ${language.code}`,
        base,
        body: `<header class="page-heading document-heading">
          <p class="eyebrow"><span class="eyebrow-line" aria-hidden="true"></span>Project / Technical design document / iteration-${iteration.number}</p>
          <h1>${escapeHtml(project.title)}</h1>
          <p class="page-description"><span class="project-status project-status-${project.status.toLowerCase()}">${project.status}</span> Technical design and implementation reference.</p>
          <div class="document-actions">
            <a class="profile-link" href="${base}project.html">Back to Project</a>
            <a class="profile-link" href="${url}tdd.md" download>Download Markdown</a>
          </div>
        </header>${navigation}${toc}<article class="markdown-body" lang="${language.code}" aria-label="Technical design document">${html}</article>`,
      });
      await writeFile(join(directory, "index.html"), page("../../../../"));
      if (iteration === latest && language.code === iteration.defaultLanguage) {
        await writeFile(join(legacyDirectory, "index.html"), page("../../"));
        await copyFile(sourcePath, join(legacyDirectory, "tdd.md"));
      }
    }
  }
}
