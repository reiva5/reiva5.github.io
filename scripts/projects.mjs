import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function renderProjectCards(projects) {
  return `<ul class="project-list">${projects.map((project) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
      throw new Error(`Invalid project slug: ${project.slug}`);
    }
    if (!["Draft", "Proposed", "Implemented"].includes(project.status)) {
      throw new Error(`Invalid project status: ${project.status}`);
    }
    return `<li><article class="project-card" aria-labelledby="${project.slug}-title">
      <header class="project-card-heading">
        <span class="section-label">Infrastructure / IaC</span>
        <span class="project-status project-status-${project.status.toLowerCase()}">${project.status}</span>
      </header>
      <h2 id="${project.slug}-title">${escapeHtml(project.title)}</h2>
      <p>${escapeHtml(project.summary)}</p>
      <ul class="project-tags" aria-label="Technologies">${project.technologies.map((technology) =>
        `<li>${escapeHtml(technology)}</li>`).join("")}</ul>
      <a class="profile-link" href="./projects/${project.slug}/">Read TDD <span aria-hidden="true">-&gt;</span></a>
    </article></li>`;
  }).join("")}</ul>`;
}

export function renderPage(template, { title, description, breadcrumb, body, base = "./" }) {
  const values = {
    title: escapeHtml(title),
    description: escapeHtml(description),
    breadcrumb: escapeHtml(breadcrumb),
    body,
    base: escapeHtml(base),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (placeholder, key) => {
    if (!(key in values)) {
      throw new Error(`Unknown page placeholder: ${placeholder}`);
    }
    return values[key];
  });
}

export async function renderDocument(source, renderDiagram) {
  const markdown = new Marked({ gfm: true });
  const tokens = markdown.lexer(source);
  const diagrams = [];
  let heading = "Technical design";
  markdown.walkTokens(tokens, (token) => {
    if (token.type === "heading") {
      heading = token.text;
    }
    if (token.type === "code" && token.lang === "mermaid") {
      diagrams.push({ token, caption: `Diagram ${diagrams.length + 1}: ${heading}` });
    }
  });
  const images = new Map();
  for (const [index, diagram] of diagrams.entries()) {
    const path = await renderDiagram(diagram.token.text, index + 1);
    images.set(diagram.token, { path, caption: diagram.caption });
  }
  const headings = [];
  const slugs = new Map();
  markdown.use({
    renderer: {
      heading({ tokens: inlineTokens, depth, text }) {
        const label = this.parser.parseInline(inlineTokens);
        const slug = text.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
        const count = (slugs.get(slug) || 0) + 1;
        slugs.set(slug, count);
        const id = `tdd-${slug}${count > 1 ? `-${count}` : ""}`;
        if (depth === 2) {
          headings.push({ id, label: sanitizeHtml(label, { allowedTags: [], allowedAttributes: {} }) });
        }
        const level = Math.min(depth + 1, 6);
        return `<h${level} id="${id}">${label}</h${level}>`;
      },
      code(token) {
        if (!images.has(token)) {
          return false;
        }
        const { path, caption } = images.get(token);
        return `<figure class="document-diagram">
          <div class="diagram-frame" tabindex="0" role="region" aria-label="${escapeHtml(caption)}">
            <img src="${escapeHtml(path)}" alt="${escapeHtml(caption)}" decoding="async">
          </div>
          <figcaption>${escapeHtml(caption)}</figcaption>
          <details><summary>View diagram source</summary><pre><code>${escapeHtml(token.text)}</code></pre></details>
        </figure>`;
      },
      html({ text }) {
        return escapeHtml(text);
      },
    },
  });
  const html = sanitizeHtml(markdown.parser(tokens), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "figure", "figcaption", "details", "summary"],
    allowedAttributes: {
      "*": ["id", "class"],
      a: ["href", "title"],
      img: ["src", "alt", "decoding"],
      div: ["class", "tabindex", "role", "aria-label"],
    },
    allowedSchemes: ["https", "http", "mailto"],
  }).replace(/<table>/g, '<div class="table-scroll" tabindex="0" role="region" aria-label="Document table"><table>')
    .replace(/<\/table>/g, "</table></div>");
  const toc = `<nav class="document-toc" aria-label="Document contents"><h2>On this page</h2><ol>${
    headings.map(({ id, label }) => `<li><a href="#${id}">${label}</a></li>`).join("")
  }</ol></nav>`;
  return { html, toc, diagramCount: diagrams.length };
}
