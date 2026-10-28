import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import { buildProjectDocuments, documentURL, projectIterations, renderDocumentNavigation } from "../../scripts/project-documents.mjs";

const language = (code) => ({ code, label: code === "id" ? "Bahasa Indonesia" : "English", source: `tdd.${code}.md` });
const iteration = (number, codes = ["id", "en"]) => ({
  number, defaultLanguage: codes[0], languages: codes.map(language),
});
const project = {
  slug: "example-project", title: "Example & Project", summary: "Design reference", status: "Draft",
  iterations: [iteration(1), iteration(3)],
};
const documentFor = (html) => new JSDOM(html).window.document;

describe("published project iterations", () => {
  it("sorts versions numerically without mutating metadata and supports additional language tags", () => {
    const input = { ...project, iterations: [iteration(10, ["pt-br"]), iteration(2, ["fr"])] };
    expect(projectIterations(input).map((item) => item.number)).toEqual([2, 10]);
    expect(input.iterations.map((item) => item.number)).toEqual([10, 2]);
    expect(documentURL(project, iteration(3), "en")).toBe("/projects/example-project/iteration-3/en/");
  });

  it.each([
    ["unsafe slug", { slug: "../outside" }, "Invalid project slug"],
    ["no iterations", { iterations: undefined }, "Missing iterations"],
    ["empty iterations", { iterations: [] }, "Missing iterations"],
    ["non-array iterations", { iterations: {} }, "Missing iterations"],
    ["duplicate numbers", { iterations: [iteration(1), iteration(1)] }, "Invalid or duplicate iteration"],
    ...[0, -1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1].map((number) =>
      [`invalid number ${number}`, { iterations: [iteration(number)] }, "Invalid or duplicate iteration"]),
    ["no languages", { iterations: [{ ...iteration(1), languages: undefined }] }, "Missing languages"],
    ["empty languages", { iterations: [iteration(1, [])] }, "Missing languages"],
    ["duplicate languages", { iterations: [iteration(1, ["en", "en"])] }, "Invalid or duplicate language"],
    ["invalid language", { iterations: [iteration(1, ['en"><script>'])] }, "Invalid or duplicate language"],
    ["missing default", { iterations: [{ ...iteration(1), defaultLanguage: "fr" }] }, "Unavailable default language"],
    ...[undefined, "", " "].map((label) =>
      ["missing label", { iterations: [{ ...iteration(1), languages: [{ ...language("id"), label }] }] }, "Missing language label"]),
    ...[undefined, "../tdd.md", "sub/../tdd.md", "sub/./tdd.md", "sub//tdd.md", "/tdd.md", "C:\\tdd.md", "tdd.html"].map((source) =>
      [`unsafe source ${source}`, { iterations: [{ ...iteration(1), languages: [{ ...language("id"), source }] }] }, "Invalid document source"]),
  ])("rejects %s explicitly", (name, override, error) => {
    expect(() => projectIterations({ ...project, ...override })).toThrow(error);
  });
});

describe("static language and iteration links", () => {
  it("keeps the language when moving between published iterations, including gaps", () => {
    const iterations = projectIterations(project);
    const document = documentFor(renderDocumentNavigation(project, iterations, iterations[0], "en"));
    expect(document.querySelector('[aria-label="Document language"] [aria-current="page"]').textContent).toBe("English");
    const picker = document.querySelector(".language-picker");
    expect(picker.tagName).toBe("DETAILS");
    expect(picker.open).toBe(false);
    expect(picker.querySelector("summary").textContent).toBe("English");
    expect(picker.querySelector("summary span").lang).toBe("en");
    expect(picker.querySelector("ul").getAttribute("tabindex")).toBe("0");
    expect(picker.querySelector("ul").getAttribute("aria-label")).toBe("Available translations");
    const indonesia = document.querySelector('[hreflang="id"]');
    expect(indonesia.lang).toBe("id");
    expect(indonesia.getAttribute("href")).toBe("/projects/example-project/iteration-1/id/");
    expect(document.querySelector('[aria-label="Document iteration"] [aria-current="page"]').textContent).toBe("iteration-1");
    expect(document.querySelector('[rel="next"]').getAttribute("href")).toBe("/projects/example-project/iteration-3/en/");
    expect(document.querySelector('[rel="prev"]')).toBeNull();
    expect(document.querySelector('[aria-disabled="true"]').textContent).toBe("Previous iteration unavailable");
  });

  it("provides previous and next links in a middle iteration and disables the final next action", () => {
    const iterations = [iteration(1), iteration(2), iteration(3)];
    const middle = documentFor(renderDocumentNavigation(project, iterations, iterations[1], "id"));
    expect(middle.querySelector('[rel="prev"]').getAttribute("href")).toBe("/projects/example-project/iteration-1/id/");
    expect(middle.querySelector('[rel="next"]').getAttribute("href")).toBe("/projects/example-project/iteration-3/id/");
    const last = documentFor(renderDocumentNavigation(project, iterations, iterations[2], "id"));
    expect(last.querySelector('[rel="next"]')).toBeNull();
    expect(last.querySelector('[aria-disabled="true"]').textContent).toBe("Next iteration unavailable");
  });

  it("shows a named fallback rather than silently switching or linking to an unavailable translation", () => {
    const iterations = [iteration(1), iteration(2, ["id"])];
    iterations[1].languages[0].label = 'Bahasa <Indonesia> & "test"';
    const document = documentFor(renderDocumentNavigation(project, iterations, iterations[0], "en"));
    const next = document.querySelector('[rel="next"]');
    expect(next.textContent).toBe('Next: iteration-2 (Bahasa <Indonesia> & "test")');
    expect(next.getAttribute("href")).toBe("/projects/example-project/iteration-2/id/");
    expect(document.querySelector("indonesia")).toBeNull();
    const fallbackPage = documentFor(renderDocumentNavigation(project, iterations, iterations[1], "id"));
    expect(fallbackPage.querySelector("summary").textContent).toBe('Bahasa <Indonesia> & "test"');
    expect(fallbackPage.querySelector("indonesia")).toBeNull();
    const single = documentFor(renderDocumentNavigation(project, [iterations[0]], iterations[0], "id"));
    expect(single.querySelectorAll('[aria-disabled="true"]')).toHaveLength(2);
  });
});

describe("built project documents", () => {
  it("writes every language/version, its original source and diagrams, and a latest-default legacy page", async () => {
    const root = await mkdtemp(join(tmpdir(), "project-documents-"));
    const output = join(root, "dist");
    const sourceDirectory = join(root, "projects", project.slug);
    await mkdir(join(sourceDirectory, "iteration-3"), { recursive: true });
    const input = structuredClone(project);
    input.iterations[1].languages[1].source = "iteration-3/tdd.en.md";
    const source = "# Design\n## Scope\nContent\n```mermaid\nflowchart LR; A-->B\n```";
    for (const path of ["tdd.id.md", "tdd.en.md", "iteration-3/tdd.en.md"]) {
      await writeFile(join(sourceDirectory, ...path.split("/")), source);
    }
    const template = await readFile(new URL("../../templates/project.html", import.meta.url), "utf8");
    const renderDiagram = vi.fn(async () => "<svg>diagram</svg>");
    try {
      await buildProjectDocuments({ project: input, template, root, output, renderDiagram });
      expect(renderDiagram).toHaveBeenCalledTimes(4);
      for (const number of [1, 3]) {
        for (const code of ["id", "en"]) {
          const directory = join(output, "projects", project.slug, `iteration-${number}`, code);
          const document = documentFor(await readFile(join(directory, "index.html"), "utf8"));
          expect(document.querySelector(".markdown-body").lang).toBe(code);
          expect(document.querySelector(".breadcrumb").textContent).toContain(`iteration-${number} / ${code}`);
          expect(document.querySelector('link[href$="styles.css"]').getAttribute("href")).toBe("../../../../styles.css");
          expect(document.querySelector(".markdown-body img").getAttribute("src"))
            .toBe(`/projects/example-project/iteration-${number}/${code}/diagrams/diagram-1.svg`);
          expect(document.querySelector('a[download]').getAttribute("href"))
            .toBe(`/projects/example-project/iteration-${number}/${code}/tdd.md`);
          expect(await readFile(join(directory, "tdd.md"), "utf8")).toBe(source);
          expect(await readFile(join(directory, "diagrams", "diagram-1.svg"), "utf8")).toBe("<svg>diagram</svg>");
        }
      }
      const legacy = join(output, "projects", project.slug);
      const document = documentFor(await readFile(join(legacy, "index.html"), "utf8"));
      expect(document.querySelector(".markdown-body").lang).toBe("id");
      expect(document.querySelector(".breadcrumb").textContent).toContain("iteration-3 / id");
      expect(document.querySelector('link[href$="styles.css"]').getAttribute("href")).toBe("../../styles.css");
      expect(await readFile(join(legacy, "tdd.md"), "utf8")).toBe(source);
      await rm(join(sourceDirectory, "tdd.id.md"));
      await expect(buildProjectDocuments({ project: input, template, root, output, renderDiagram })).rejects.toThrow("ENOENT");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
