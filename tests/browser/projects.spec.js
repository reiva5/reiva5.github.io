import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { test as base, expect } from "@playwright/test";
import { buildProjectDocuments } from "../../scripts/project-documents.mjs";

const projectTitle = "Centralized Cloud Infrastructure";
const documentURL = "/projects/centralized-cloud-infrastructure/";
const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
    await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
    await use(page);
    expect(errors).toEqual([]);
  },
});

test("navigates from Home to the project card and its themed, static TDD", async ({ page }) => {
  const missing = [];
  page.on("response", (response) => {
    if (new URL(response.url()).origin === "http://127.0.0.1:4173" && response.status() >= 400) {
      missing.push(response.url());
    }
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Project", exact: true }).click();
  await expect(page).toHaveTitle("Project | reiva5");
  await expect(page.getByRole("heading", { name: "Project", exact: true })).toBeVisible();
  await expect(page.locator(".project-list > li")).toHaveCount(1);
  const card = page.getByRole("article", { name: projectTitle });
  await expect(card).toBeVisible();
  await expect(card.locator(".project-status")).toHaveText("Draft");
  await expect(card.locator(".project-status")).toHaveCSS("background-color", "rgb(245, 183, 38)");
  await expect(card).toContainText("Cloudflare");
  await expect(card.locator(".project-iteration")).toHaveText("iteration-1");
  await page.screenshot({ path: "test-results/project-desktop.png" });
  await card.getByRole("link", { name: "Read TDD" }).click();
  await expect(page).toHaveURL(documentURL);
  await expect(page).toHaveTitle(`${projectTitle} - TDD | reiva5`);
  await expect(page.getByRole("heading", { name: projectTitle, exact: true })).toBeVisible();
  await expect(page.locator(".markdown-body")).toHaveAttribute("lang", "id");
  await expect(page.locator(".markdown-body")).toHaveCSS("background-color", "rgb(247, 247, 242)");
  await expect(page.locator(".markdown-body table")).toHaveCount(7);
  await expect(page.locator(".document-toc a")).toHaveCount(15);
  const images = page.locator(".document-diagram img");
  await expect(images).toHaveCount(4);
  for (const image of await images.all()) {
    await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(image).toHaveAttribute("alt", /^Diagram [1-4]:/);
  }
  await expect(page.locator(".markdown-body")).not.toContainText("CloudFront");
  await expect(page.locator("script")).toHaveCount(2);
  expect(await page.evaluate(() => typeof window.mermaid)).toBe("undefined");
  await page.screenshot({ path: "test-results/project-tdd-desktop.png" });
  await page.getByRole("link", { name: "4. Arsitektur dan diagram komponen", exact: true }).click();
  await expect(page).toHaveURL(/#tdd-4-arsitektur-dan-diagram-komponen$/);
  await expect(page.getByRole("heading", { name: "4. Arsitektur dan diagram komponen", exact: true })).toBeInViewport();
  await page.locator(".document-diagram").first().screenshot({ path: "test-results/project-components.png" });
  await page.locator(".document-diagram").first().getByText("View diagram source", { exact: true }).click();
  await expect(page.locator(".document-diagram").first().locator("details pre")).toBeVisible();
  expect(missing).toEqual([]);
});

test("switches the complete built TDD between Indonesian and English at stable iteration URLs", async ({ page }) => {
  const missing = [];
  page.on("response", (response) => {
    if (new URL(response.url()).origin === "http://127.0.0.1:4173" && response.status() >= 400) {
      missing.push(response.url());
    }
  });
  await page.goto(documentURL);
  const languages = page.getByRole("navigation", { name: "Document language" });
  await expect(languages.locator('[aria-current="page"]')).toHaveText("Bahasa Indonesia");
  await expect(languages.locator(".language-options")).toBeHidden();
  await expect(languages.locator("summary")).toHaveText("Bahasa Indonesia");
  await languages.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(languages.getByRole("link", { name: "English", exact: true })).toBeVisible();
  await languages.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(`${documentURL}iteration-1/en/`);
  await expect(page.locator(".markdown-body")).toHaveAttribute("lang", "en");
  await expect(languages.locator('[aria-current="page"]')).toHaveText("English");
  await expect(languages.locator("summary")).toHaveText("English");
  await expect(languages.locator(".language-options")).toBeHidden();
  await expect(page.locator(".document-toc a")).toHaveCount(15);
  await expect(page.locator(".markdown-body table")).toHaveCount(7);
  for (const image of await page.locator(".document-diagram img").all()) {
    await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
  }
  const iterations = page.getByRole("navigation", { name: "Document iteration" });
  await expect(iterations.locator('[aria-current="page"]')).toHaveText("iteration-1");
  await expect(iterations.locator('[aria-disabled="true"]')).toHaveCount(2);
  await expect(iterations.getByRole("link")).toHaveCount(1);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Markdown" }).click();
  const download = await downloadPromise;
  expect(await readFile(await download.path(), "utf8"))
    .toBe(await readFile(resolve("projects", "centralized-cloud-infrastructure", "tdd.en.md"), "utf8"));
  await page.reload();
  await expect(page.locator(".markdown-body")).toHaveAttribute("lang", "en");
  await languages.locator("summary").click();
  await languages.getByRole("link", { name: "Bahasa Indonesia", exact: true }).click();
  await expect(page).toHaveURL(`${documentURL}iteration-1/id/`);
  await expect(page.locator(".markdown-body")).toHaveAttribute("lang", "id");
  await page.getByRole("link", { name: "Back to Project" }).click();
  await expect(page).toHaveURL("/project.html");
  expect(missing).toEqual([]);
});

test("navigates built future iterations and additional languages with explicit translation fallback", async ({ page }) => {
  await mkdir(resolve("test-results"), { recursive: true });
  const root = await mkdtemp(resolve("test-results", "navigation-sources-"));
  const slug = "navigation-fixture";
  const sourceDirectory = join(root, "projects", slug);
  const output = resolve("dist");
  const directory = join(output, "projects", slug);
  const project = {
    slug, title: "Navigation fixture", summary: "Published test documents", status: "Draft",
    iterations: [
      { number: 1, defaultLanguage: "id", languages: [
        { code: "id", label: "Bahasa Indonesia", source: "first.id.md" },
        { code: "en", label: "English", source: "first.en.md" },
        { code: "fr", label: "Francais", source: "first.fr.md" },
        ...["de", "es", "it", "ja", "ko", "nl", "pt", "zh"].map((code) => ({
          code, label: `Test language ${code}`, source: "first.en.md",
        })),
      ] },
      { number: 3, defaultLanguage: "id", languages: [
        { code: "id", label: "Bahasa Indonesia", source: "third.id.md" },
        { code: "en", label: "English", source: "third.en.md" },
      ] },
    ],
  };
  await mkdir(sourceDirectory, { recursive: true });
  for (const [source, content] of Object.entries({
    "first.id.md": "# Iterasi pertama", "first.en.md": "# First iteration",
    "first.fr.md": "# Premiere iteration", "third.id.md": "# Iterasi ketiga", "third.en.md": "# Third iteration",
  })) {
    await writeFile(join(sourceDirectory, source), content);
  }
  try {
    await buildProjectDocuments({
      project, root, output,
      template: await readFile(resolve("templates", "project.html"), "utf8"),
      renderDiagram: async () => { throw new Error("This navigation fixture contains no diagrams"); },
    });
    await page.goto(`/projects/${slug}/iteration-1/en/`);
    await page.getByRole("link", { name: "Next: iteration-3", exact: true }).click();
    await expect(page).toHaveURL(`/projects/${slug}/iteration-3/en/`);
    await expect(page.locator(".markdown-body")).toHaveText("Third iteration");
    await page.getByRole("link", { name: "Previous: iteration-1", exact: true }).click();
    await expect(page.locator(".markdown-body")).toHaveText("First iteration");
    const picker = page.locator(".language-picker");
    await picker.locator("summary").click();
    const options = picker.locator(".language-options");
    await expect(options).toBeVisible();
    const dimensions = await options.evaluate((element) => ({
      scroll: element.scrollHeight, height: element.clientHeight,
      overflow: getComputedStyle(element).overflowY,
      maximum: Math.min(256, innerHeight / 2),
    }));
    expect(dimensions.scroll).toBeGreaterThan(dimensions.height);
    expect(dimensions.height).toBeLessThanOrEqual(dimensions.maximum);
    expect(dimensions.overflow).toBe("auto");
    await options.focus();
    await page.keyboard.press("End");
    await expect.poll(() => options.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(picker.getByRole("link", { name: "Test language zh", exact: true })).toBeInViewport();
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await options.evaluate((element) => element.getBoundingClientRect().width <= innerWidth)).toBe(true);
    await picker.locator("summary").click();
    await expect(options).toBeHidden();
    await picker.locator("summary").focus();
    await page.keyboard.press("Space");
    await expect(options).toBeVisible();
    await page.getByRole("link", { name: "Francais", exact: true }).click();
    await expect(page.locator(".markdown-body")).toHaveAttribute("lang", "fr");
    await page.getByRole("link", { name: "Next: iteration-3 (Bahasa Indonesia)", exact: true }).click();
    await expect(page).toHaveURL(`/projects/${slug}/iteration-3/id/`);
    await expect(page.locator(".markdown-body")).toHaveText("Iterasi ketiga");
    await expect(page.getByRole("link", { name: "Francais", exact: true })).toHaveCount(0);
    await expect(page.getByText("Next iteration unavailable", { exact: true })).toHaveAttribute("aria-disabled", "true");
    await page.goto(`/projects/${slug}/`);
    await expect(page.locator(".breadcrumb")).toContainText("iteration-3 / id");
    await expect(page.locator(".markdown-body")).toHaveText("Iterasi ketiga");
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});

test("ships the exact Markdown source and full-size SVG with the built document", async ({ page, request }) => {
  await page.goto(documentURL);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download Markdown" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("tdd.md");
  const source = await readFile(resolve("projects", "centralized-cloud-infrastructure", "tdd.md"), "utf8");
  expect(await readFile(await download.path(), "utf8")).toBe(source);
  for (const link of await page.getByRole("link", { name: "Open full-size diagram" }).all()) {
    const response = await request.get(new URL(await link.getAttribute("href"), page.url()).href);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
    expect(await response.text()).toContain("<svg");
  }
  await page.getByRole("link", { name: "Back to Project" }).click();
  await expect(page).toHaveURL("/project.html");
});

test("provides distinct yellow, blue, and green status styles with visible text labels", async ({ page }) => {
  await page.goto("/project.html");
  const colors = await page.evaluate(() => ["Draft", "Proposed", "Implemented"].map((status) => {
    const label = document.createElement("span");
    label.className = `project-status project-status-${status.toLowerCase()}`;
    label.textContent = status;
    document.querySelector("main").append(label);
    return { status: label.textContent, color: getComputedStyle(label).backgroundColor };
  }));
  expect(colors).toEqual([
    { status: "Draft", color: "rgb(245, 183, 38)" },
    { status: "Proposed", color: "rgb(139, 178, 222)" },
    { status: "Implemented", color: "rgb(167, 199, 162)" },
  ]);
});

for (const width of [320, 390, 760, 761, 1440]) {
  test(`keeps project cards and the full TDD within the viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const url of ["/project.html", documentURL, `${documentURL}iteration-1/en/`]) {
      await page.goto(url);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('nav[aria-label="Main navigation"] a[aria-current="page"]')).toHaveText(/Project/);
      const tables = page.locator(".table-scroll");
      for (const table of await tables.all()) {
        expect(await table.evaluate((element) => getComputedStyle(element).overflowX)).toBe("auto");
      }
    }
    if (width === 390) {
      await page.screenshot({ path: "test-results/project-tdd-mobile.png" });
    }
  });
}

test("supports the Project mobile drawer, keyboard skip link, and direct document links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/resume.html#projects");
  await page.getByRole("link", { name: "View Project", exact: true }).click();
  await page.locator("#menu-toggle").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#sidebar")).toBeHidden();
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.goto(`${documentURL}#tdd-9-kredensial-identitas-dan-pengamanan`);
  await expect(page.getByRole("heading", { name: "9. Kredensial, identitas, dan pengamanan", exact: true })).toBeInViewport();
  await page.locator("#menu-toggle").click();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveTitle("Home | reiva5");
});

test("keeps the project list, full Markdown content, anchors, and diagrams readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.goto("/project.html");
  await expect(page.getByRole("article", { name: projectTitle })).toBeVisible();
  await page.getByRole("link", { name: "Read TDD" }).click();
  await expect(page.locator(".markdown-body")).toBeVisible();
  await expect(page.locator(".document-diagram img")).toHaveCount(4);
  await page.getByRole("link", { name: "1. Ringkasan", exact: true }).click();
  await expect(page.getByRole("heading", { name: "1. Ringkasan", exact: true })).toBeInViewport();
  for (const image of await page.locator(".document-diagram img").all()) {
    await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
  }
  const languages = page.getByRole("navigation", { name: "Document language" });
  await languages.locator("summary").click();
  await languages.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(`${documentURL}iteration-1/en/`);
  await expect(page.locator(".markdown-body")).toHaveAttribute("lang", "en");
  await expect(page.locator(".document-diagram img")).toHaveCount(4);
  const contentsLink = page.locator(".document-toc a").first();
  const heading = page.locator(await contentsLink.getAttribute("href"));
  await contentsLink.click();
  await expect(heading).toBeInViewport();
  await languages.locator("summary").click();
  await languages.getByRole("link", { name: "Bahasa Indonesia", exact: true }).click();
  await expect(page).toHaveURL(`${documentURL}iteration-1/id/`);
  await expect(page.locator(".markdown-body")).toHaveAttribute("lang", "id");
  await context.close();
});
