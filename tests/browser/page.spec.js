import { test as base, expect } from "@playwright/test";

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

test("loads the built page and its local assets without relying on external fonts", async ({ page }) => {
  const assets = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === "http://127.0.0.1:4173" && ["/styles.css", "/script.js"].includes(url.pathname)) {
      assets.push({ path: url.pathname, status: response.status() });
    }
  });
  await page.goto("/");
  await expect(page).toHaveTitle("Home | reiva5");
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Belum ada konten.", { exact: true })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(242, 242, 235)");
  expect(assets.sort((left, right) => left.path.localeCompare(right.path))).toEqual([
    { path: "/script.js", status: 200 },
    { path: "/styles.css", status: 200 },
  ]);
});

for (const width of [320, 390, 760, 761, 1024, 1440]) {
  test(`renders without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const sidebar = page.locator("#sidebar");
    if (width <= 760) {
      await expect(sidebar).toBeHidden();
    } else {
      await expect(sidebar).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const toggle = await page.locator("#menu-toggle").boundingBox();
    expect(toggle.width).toBeGreaterThanOrEqual(44);
    expect(toggle.height).toBeGreaterThanOrEqual(44);
    expect(await page.locator("#page").evaluate((element) => element.getBoundingClientRect().left)).toBe(
      width <= 760 ? 0 : 280,
    );
  });
}

test("expands content when the desktop sidebar is hidden and can reopen it", async ({ page }) => {
  await page.goto("/");
  const sidebar = page.locator("#sidebar");
  const toggle = page.locator("#menu-toggle");
  await toggle.click();
  await expect(sidebar).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAccessibleName("Tampilkan menu");
  await expect(toggle).toBeFocused();
  expect(await page.locator("#page").evaluate((element) => element.getBoundingClientRect().left)).toBe(0);
  await toggle.click();
  await expect(sidebar).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.locator("#sidebar-close").click();
  await expect(sidebar).toBeHidden();
  await expect(toggle).toBeFocused();
});

test("navigates to Resume and its three independently addressable sections", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Resume", exact: true }).click();
  await expect(page).toHaveTitle("Cards | Resume | reiva5");
  await expect(page.getByRole("heading", { name: "Resume", exact: true })).toBeVisible();
  await expect(page.locator("#cards")).toBeVisible();
  for (const [name, id] of [["Projects", "projects"], ["Page", "resume-page"], ["Cards", "cards"]]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`resume\\.html#${id}$`));
    await expect(page.locator(`#${id}`)).toBeVisible();
    await expect(page.getByRole("heading", { name, exact: true })).toBeFocused();
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "location");
  }
  await page.goBack();
  await expect(page.locator("#resume-page")).toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveTitle("Home | reiva5");
});

test("keeps keyboard focus inside the mobile dialog and restores it on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("#menu-toggle").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("#sidebar-close")).toBeFocused();
  expect(await page.locator("#page").evaluate((element) => element.inert)).toBe(true);
  await page.locator("#main-content").evaluate((element) => element.focus());
  await expect(page.locator("#sidebar-close")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Home", exact: true })).toBeFocused();
  for (const name of ["Resume", "Cards", "Projects", "Page"]) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name, exact: true })).toBeFocused();
  }
  await page.keyboard.press("Tab");
  await expect(page.locator(".brand")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("link", { name: "Page", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#menu-toggle")).toBeFocused();
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  expect(await page.locator("#page").evaluate((element) => element.inert)).toBe(false);
});

test("closes the mobile drawer through its close button or the backdrop", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.locator("#menu-toggle");
  await toggle.click();
  await page.locator("#sidebar-close").click();
  await expect(page.locator("#sidebar")).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.mouse.click(382, 130);
  await expect(page.locator("#sidebar")).toBeHidden();
  await expect(toggle).toBeFocused();
  expect(await page.locator("body").evaluate((element) => element.classList.contains("menu-open"))).toBe(false);
});

test("preserves the desktop preference and restores focus across viewport changes", async ({ page }) => {
  await page.goto("/");
  await page.locator(".brand").focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#sidebar")).toBeHidden();
  await expect(page.locator("#menu-toggle")).toBeFocused();
  await page.locator("#menu-toggle").click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator("#sidebar")).toBeVisible();
  await expect(page.locator("#sidebar")).not.toHaveAttribute("aria-modal", "true");
  expect(await page.locator("#page").evaluate((element) => element.inert)).toBe(false);
  await page.locator("#menu-toggle").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#menu-toggle").click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator("#sidebar")).toBeHidden();
  await expect(page.locator("#menu-toggle")).toBeFocused();
});

test("supports the skip link and keeps hidden sidebar controls out of the tab order", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.locator("#menu-toggle").click();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.getElementById("sidebar").contains(document.activeElement))).toBe(false);
});

test("disables transitions for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#menu-toggle")).toHaveCSS("transition-duration", "0s");
  await expect(page.locator(".nav-item-active")).toHaveCSS("transition-duration", "0s");
});

test("supports direct Resume links and closes the mobile drawer when a submenu is selected", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/resume.html#projects");
  await expect(page.locator("#projects")).toBeVisible();
  await expect(page.locator("#cards")).toBeHidden();
  await page.locator("#menu-toggle").click();
  await page.getByRole("link", { name: "Page", exact: true }).click();
  await expect(page.locator("#sidebar")).toBeHidden();
  await expect(page.locator("#resume-page-title")).toBeFocused();
  expect(await page.locator("#page").evaluate((element) => element.inert)).toBe(false);
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.locator("#resume-page")).toBeVisible();
});

test("keeps Resume sections reachable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.goto("/resume.html");
  for (const [name, id] of [["Cards", "cards"], ["Projects", "projects"], ["Page", "resume-page"]]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await context.close();
});
