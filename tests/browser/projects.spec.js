import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test as base, expect } from "@playwright/test";

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
    for (const url of ["/project.html", documentURL]) {
      await page.goto(url);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('nav a[aria-current="page"]')).toHaveText(/Project/);
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
  await context.close();
});
