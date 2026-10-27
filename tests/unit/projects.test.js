import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { escapeHtml, renderDocument, renderPage, renderProjectCards } from "../../scripts/projects.mjs";

const project = {
  slug: "centralized-cloud-infrastructure",
  title: "Centralized Cloud Infrastructure",
  summary: "Manage AWS, Azure, GCP, and Cloudflare with Terraform.",
  status: "Draft",
  technologies: ["Terraform", "HCP Terraform", "Cloudflare"],
};

const documentFor = (html) => new JSDOM(html).window.document;

describe("static project cards", () => {
  it.each(["Draft", "Proposed", "Implemented"])("renders an accessible %s card with its status class and TDD link", (status) => {
    const document = documentFor(renderProjectCards([{ ...project, status }]));
    const card = document.querySelector("article");
    expect(document.querySelectorAll(".project-list > li")).toHaveLength(1);
    expect(card.getAttribute("aria-labelledby")).toBe(document.querySelector("h2").id);
    expect(document.querySelector("h2").textContent).toBe(project.title);
    expect(document.querySelector(".project-status").textContent).toBe(status);
    expect(document.querySelector(".project-status").classList.contains(`project-status-${status.toLowerCase()}`)).toBe(true);
    expect(document.querySelector("a").getAttribute("href")).toBe("./projects/centralized-cloud-infrastructure/");
    expect(document.querySelector(".project-tags").textContent).toContain("Cloudflare");
  });

  it("supports multiple cards without conflating their headings", () => {
    const document = documentFor(renderProjectCards([project, { ...project, slug: "another-project" }]));
    expect(document.querySelectorAll(".project-list > li")).toHaveLength(2);
    expect(new Set(Array.from(document.querySelectorAll("h2"), (heading) => heading.id)).size).toBe(2);
  });

  it("escapes metadata and rejects invalid routes and unknown status values", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
    const html = renderProjectCards([{
      ...project, title: "<script>alert(1)</script>", summary: 'A "test" & example', technologies: ["<img src=x onerror=alert(1)>"],
    }]);
    const document = documentFor(html);
    expect(document.querySelector("script, img")).toBeNull();
    expect(document.querySelector("h2").textContent).toBe("<script>alert(1)</script>");
    expect(() => renderProjectCards([{ ...project, slug: "../../outside" }])).toThrow("Invalid project slug");
    expect(() => renderProjectCards([{ ...project, status: "Ready" }])).toThrow("Invalid project status");
  });
});

describe("page template", () => {
  const template = '<title>{{title}}</title><meta name="description" content="{{description}}"><a href="{{base}}project.html">{{breadcrumb}}</a>{{body}}';

  it("escapes metadata, retains generated content, and supports root-relative-depth assets", () => {
    const html = renderPage(template, { title: "A & B", description: '"test"', breadcrumb: "<project>", body: "<main>Content</main>" });
    expect(html).toContain("<title>A &amp; B</title>");
    expect(html).toContain('content="&quot;test&quot;"');
    expect(html).toContain('href="./project.html">&lt;project&gt;</a><main>Content</main>');
    expect(renderPage(template, { title: "TDD", description: "Design", breadcrumb: "project / tdd", body: "", base: "../../" }))
      .toContain('href="../../project.html"');
  });

  it("fails explicitly for unknown template placeholders", () => {
    expect(() => renderPage("{{unknown}}", { title: "", description: "", breadcrumb: "", body: "" }))
      .toThrow("Unknown page placeholder");
    expect(() => renderPage("{{toString}}", { title: "", description: "", breadcrumb: "", body: "" }))
      .toThrow("Unknown page placeholder");
  });
});

describe("Project page behavior", () => {
  it("initializes the shared sidebar from its own classic package entry", async () => {
    vi.resetModules();
    const initializeSidebar = vi.fn();
    vi.stubGlobal("window", { SiteShell: { initializeSidebar } });
    try {
      await import("../../js/project/index.js");
      expect(initializeSidebar).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("connects the actual project metadata and shared template with accessible navigation", () => {
    const projects = JSON.parse(readFileSync(new URL("../../data/projects.json", import.meta.url), "utf8"));
    const template = readFileSync(new URL("../../templates/project.html", import.meta.url), "utf8");
    const document = documentFor(renderPage(template, {
      title: "Project", description: "Projects", breadcrumb: "project", body: renderProjectCards(projects),
    }));
    expect(projects[0].status).toBe("Draft");
    expect(document.querySelector(".project-status-draft").textContent).toBe("Draft");
    expect(document.querySelector('a[aria-current="page"]').getAttribute("href")).toBe("./project.html");
    expect(Array.from(document.querySelectorAll("script"), (script) => script.getAttribute("src")))
      .toEqual(["./js/shared/sidebar.js", "./js/project/index.js"]);
    for (const script of document.querySelectorAll("script")) {
      expect(script.defer).toBe(true);
      expect(script.getAttribute("type")).toBeNull();
    }
    expect(document.querySelector(".skip-link").getAttribute("href")).toBe("#main-content");
  });

  it("renders the complete approved Cloudflare TDD, retaining every section and all four diagrams", async () => {
    const source = readFileSync(new URL("../../projects/centralized-cloud-infrastructure/tdd.md", import.meta.url), "utf8");
    const { html, toc, diagramCount } = await renderDocument(source, async (text, index) => `./diagrams/diagram-${index}.svg`);
    const document = documentFor(html + toc);
    expect(diagramCount).toBe(4);
    expect(document.querySelectorAll(".document-toc li")).toHaveLength(15);
    expect(document.querySelectorAll("table")).toHaveLength(7);
    expect(document.body.textContent).toContain("Cloudflare");
    expect(document.body.textContent).not.toContain("CloudFront");
    for (const link of document.querySelectorAll(".document-toc a")) {
      expect(document.querySelector(link.getAttribute("href"))).not.toBeNull();
    }
  });
});

describe("Markdown document rendering", () => {
  it("renders GFM headings, tables, links, lists, and ordinary code with an accessible contents list", async () => {
    const source = [
      "# Design", "## Scope", "A **static** [reference](https://example.com).",
      "- First", "- Second", "", "| Provider | Status |", "| --- | --- |", "| Cloudflare | Draft |",
      "", "```javascript", "const value = '<script>'; ", "```", "###### Deep heading",
    ].join("\n");
    const renderDiagram = vi.fn();
    const result = await renderDocument(source, renderDiagram);
    const document = documentFor(result.html + result.toc);
    expect(document.querySelector("h1")).toBeNull();
    expect(document.querySelector("h2").textContent).toBe("Design");
    expect(document.querySelector("h6").textContent).toBe("Deep heading");
    expect(document.querySelector(".table-scroll").getAttribute("tabindex")).toBe("0");
    expect(document.querySelector("table tbody").textContent).toContain("Cloudflare");
    expect(document.querySelector("pre code").textContent).toContain("'<script>'");
    expect(document.querySelector("strong").textContent).toBe("static");
    expect(document.querySelector('nav a').getAttribute("href")).toBe("#tdd-scope");
    expect(document.querySelector("#tdd-scope").tagName).toBe("H3");
    expect(result.diagramCount).toBe(0);
    expect(renderDiagram).not.toHaveBeenCalled();
  });

  it("creates deterministic unique anchors, including non-Latin and punctuation-only headings", async () => {
    const result = await renderDocument("## Café!\n## Café!\n## !!!\n## 世界", vi.fn());
    const document = documentFor(result.html);
    expect(Array.from(document.querySelectorAll("h3"), (heading) => heading.id)).toEqual([
      "tdd-cafe", "tdd-cafe-2", "tdd-section", "tdd-section-2",
    ]);
  });

  it("renders Mermaid as local images with captions and escaped source rather than runtime JavaScript", async () => {
    const renderDiagram = vi.fn(async (source, index) => `./diagrams/diagram-${index}.svg`);
    const result = await renderDocument([
      "```mermaid", 'flowchart LR; A["<script>"] --> B', "```",
      "## Components", "```mermaid", "sequenceDiagram", "A->>B: Hello", "```",
    ].join("\n"), renderDiagram);
    const document = documentFor(result.html);
    expect(renderDiagram.mock.calls.map((call) => call[1])).toEqual([1, 2]);
    expect(result.diagramCount).toBe(2);
    expect(document.querySelectorAll("figure img")).toHaveLength(2);
    expect(document.querySelector("img").getAttribute("src")).toBe("./diagrams/diagram-1.svg");
    expect(document.querySelector("img").getAttribute("alt")).toBe("Diagram 1: Technical design");
    expect(document.querySelectorAll("figcaption")[1].textContent).toBe("Diagram 2: Components");
    expect(document.querySelector("details pre").textContent).toContain("<script>");
    expect(document.querySelector(".diagram-frame").getAttribute("role")).toBe("region");
    expect(document.querySelector("script")).toBeNull();
  });

  it("neutralizes raw HTML and unsafe links in the document and its contents list", async () => {
    const result = await renderDocument([
      "## [Unsafe](javascript:alert%281%29)",
      '<script>alert("unsafe")</script>', "",
      '<img src="x" onerror="alert(1)">', "",
      '![Unsafe image](javascript:alert%281%29)', "",
      'Normal <b onclick="alert(1)">text</b>.',
    ].join("\n"), vi.fn());
    const document = documentFor(result.html + result.toc);
    expect(document.querySelector("script, [onclick], [onerror]")).toBeNull();
    expect(document.querySelector('a[href^="javascript:"], img[src^="javascript:"]')).toBeNull();
    expect(document.querySelector("nav a").textContent).toBe("Unsafe");
    expect(document.querySelector("nav a a")).toBeNull();
  });

  it("fails the build when a diagram cannot render", async () => {
    await expect(renderDocument("```mermaid\ninvalid diagram\n```", async () => {
      throw new Error("Invalid Mermaid syntax");
    })).rejects.toThrow("Invalid Mermaid syntax");
  });
});
