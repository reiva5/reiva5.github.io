import { test as base, expect } from "@playwright/test";

const codeforcesURL = "https://codeforces.com/api/user.info?handles=reiva5";
const publicCodeforces = {
  status: "OK",
  result: [{
    handle: "Reiva5",
    firstName: "Nama",
    lastName: "Pengguna",
    rating: 1435,
    rank: "specialist",
    maxRating: 2052,
    maxRank: "candidate master",
    contribution: 0,
  }],
};
const publicSnapshot = (overrides = {}) => ({
  fullName: null,
  metadata: [],
  updatedAt: null,
  authenticationRequired: false,
  ...overrides,
});

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
    await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
    await page.route(codeforcesURL, (route) => route.fulfill({ json: publicCodeforces }));
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
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("Home | reiva5");
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("No content yet.", { exact: true })).toBeVisible();
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
  await expect(toggle).toHaveAccessibleName("Show menu");
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
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  for (const [name, id] of [["Cards", "cards"], ["Projects", "projects"], ["Page", "resume-page"]]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.locator(".profile-card")).toHaveCount(5);
  await expect(page.locator("[data-card-link]")).toHaveCount(5);
  await expect(page.locator("#card-codeforces [data-card-name]")).toHaveText("reiva5");
  await expect(page.locator("[data-card-retry]:visible")).toHaveCount(0);
  const logos = page.locator(".profile-logo");
  await expect(logos).toHaveCount(5);
  for (const logo of await logos.all()) {
    await expect.poll(() => logo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  await context.close();
});

test("loads all card scripts, site logos, and public snapshots from the exact built site", async ({ page }) => {
  const assets = [];
  const expectedPaths = [
    "/resume.js", "/resume-cards.js",
    "/data/resume/linkedin.json", "/data/resume/leetcode.json",
    "/data/resume/kaggle.json", "/data/resume/ktom.json",
    "/assets/logos/linkedin.png", "/assets/logos/codeforces.svg", "/assets/logos/leetcode.svg",
    "/assets/logos/kaggle.ico", "/assets/logos/ktom.png",
  ];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === "http://127.0.0.1:4173" && expectedPaths.includes(url.pathname)) {
      assets.push({ path: url.pathname, status: response.status() });
    }
  });
  await page.goto("/resume.html");
  await expect(page.locator(".profile-card")).toHaveCount(5);
  for (const id of ["linkedin", "leetcode", "kaggle"]) {
    await expect(page.locator(`#card-${id}`)).toHaveAttribute("data-state", "empty");
    await expect(page.locator(`#card-${id} [data-card-name]`)).toHaveText("reiva5");
  }
  await expect(page.locator("#card-codeforces")).toHaveAttribute("data-state", "ready");
  await expect(page.locator("#card-codeforces [data-card-name]")).toHaveText("Nama Pengguna");
  await expect(page.locator("#card-codeforces [data-card-metadata] dt")).toHaveText(["Highest Rank", "Highest Rating"]);
  await expect(page.locator("#card-codeforces [data-card-metadata] dd")).toHaveText(["candidate master", "2052"]);
  await expect(page.locator("#card-ktom")).toHaveAttribute("data-state", "authentication-required");
  await expect(page.locator("#card-ktom [data-card-status]")).toContainText("Authentication required");
  await expect(page.locator("#card-ktom [data-card-metadata] dt")).toHaveText(["User ID"]);
  await expect(page.locator("#card-ktom [data-card-metadata]")).toContainText("1601");
  const logos = page.locator(".profile-logo");
  await expect(logos).toHaveCount(5);
  for (const logo of await logos.all()) {
    await expect.poll(() => logo.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(logo).toHaveAttribute("alt", "");
    await expect(logo).toHaveCSS("object-fit", "contain");
  }
  expect(assets.sort((left, right) => left.path.localeCompare(right.path))).toEqual(
    expectedPaths.map((path) => ({ path, status: 200 })).sort((left, right) => left.path.localeCompare(right.path)),
  );
  for (const [platform, href] of [
    ["LinkedIn", "https://linkedin.com/in/reiva5"],
    ["Codeforces", "https://codeforces.com/profile/reiva5"],
    ["LeetCode", "https://leetcode.com/u/reiva5"],
    ["Kaggle", "https://kaggle.com/reiva5"],
    ["KTOM", "https://ktom-tomi.or.id/users/1601-0reiva5"],
  ]) {
    const link = page.getByRole("link", { name: `View profile on ${platform} (opens in a new tab)`, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});

test("renders other cards while a provider is pending and bounds its timeout to eight seconds", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-13T15:00:00.000Z") });
  await page.clock.pauseAt(new Date("2026-10-13T15:00:01.000Z"));
  await page.route(codeforcesURL, () => {}, { times: 1 });
  await page.goto("/resume.html", { waitUntil: "domcontentloaded" });
  const card = page.locator("#card-codeforces");
  await expect(card).toHaveAttribute("data-state", "loading");
  await expect(card.locator("[data-card-link]")).toBeVisible();
  await expect(card.locator("[data-card-retry]")).toBeDisabled();
  await expect(page.locator("#card-linkedin")).toHaveAttribute("data-state", "empty");
  await expect(page.locator("#card-ktom")).toHaveAttribute("data-state", "authentication-required");
  await page.clock.fastForward(7_999);
  await expect(card).toHaveAttribute("data-state", "loading");
  await page.clock.fastForward(1);
  await expect(card).toHaveAttribute("data-state", "error");
  await expect(card.locator("[data-card-status]")).toContainText("timed out after 8 seconds");
  await expect(card).toHaveAttribute("aria-busy", "false");
  await card.locator("[data-card-retry]").click();
  await expect(card).toHaveAttribute("data-state", "ready");
});

test("isolates failures and sends a retry only to the failed provider", async ({ page }) => {
  const counts = new Map();
  page.on("request", (request) => {
    if (request.url().includes("/data/resume/") || request.url() === codeforcesURL) {
      counts.set(request.url(), (counts.get(request.url()) || 0) + 1);
    }
  });
  await page.route(codeforcesURL, (route) => route.fulfill({ status: 503, body: "Unavailable" }), { times: 1 });
  await page.goto("/resume.html");
  const card = page.locator("#card-codeforces");
  await expect(card).toHaveAttribute("data-state", "error");
  await expect(card.locator("[data-card-status]")).toContainText("HTTP 503");
  await expect(page.locator("#card-leetcode")).toHaveAttribute("data-state", "empty");
  await expect(page.locator("#card-ktom")).toHaveAttribute("data-state", "authentication-required");
  await card.getByRole("button", { name: "Retry Codeforces metadata" }).click();
  await expect(card).toHaveAttribute("data-state", "ready");
  expect(counts.get(codeforcesURL)).toBe(2);
  for (const platform of ["linkedin", "leetcode", "kaggle", "ktom"]) {
    expect(counts.get(`http://127.0.0.1:4173/data/resume/${platform}.json`)).toBe(1);
  }
});

test("renders custom metadata as text and retains successful data after an invalid refresh", async ({ page }) => {
  const snapshot = publicSnapshot({
    fullName: "<img src=x onerror=alert(1)>",
    metadata: [
      { label: "<script>Label</script>", value: "Custom value" },
      { label: "Jumlah", value: 0 },
      { label: "Aktif", value: false },
    ],
    updatedAt: "2026-10-13T15:00:00.000Z",
  });
  await page.route("**/data/resume/linkedin.json", (route) => route.fulfill({ json: snapshot }));
  await page.goto("/resume.html");
  const card = page.locator("#card-linkedin");
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(card.locator("[data-card-name]")).toHaveText(snapshot.fullName);
  await expect(card.locator("img")).toHaveCount(1);
  await expect(card.locator("img")).toHaveAttribute("src", "./assets/logos/linkedin.png");
  await expect(card.locator("script")).toHaveCount(0);
  await expect(card.locator("dd")).toHaveText(["Custom value", "0", "false"]);
  await expect(card.locator("time")).toHaveAttribute("datetime", snapshot.updatedAt);
  await page.route("**/data/resume/linkedin.json", (route) => route.fulfill({
    json: publicSnapshot({ metadata: [{ label: "Invalid", value: {} }] }),
  }));
  await card.locator("[data-card-retry]").click();
  await expect(card).toHaveAttribute("data-state", "error");
  await expect(card.locator("[data-card-status]")).toContainText("The last successful data is still displayed.");
  await expect(card.locator("dd")).toHaveText(["Custom value", "0", "false"]);
  await expect(page.locator("#card-codeforces")).toHaveAttribute("data-state", "ready");
});

test("reports malformed JSON separately and keeps profile links usable", async ({ page }) => {
  await page.route("**/data/resume/kaggle.json", (route) => route.fulfill({
    contentType: "application/json",
    body: "{invalid",
  }));
  await page.goto("/resume.html");
  const card = page.locator("#card-kaggle");
  await expect(card).toHaveAttribute("data-state", "error");
  await expect(card.locator("[data-card-status]")).toContainText("Invalid JSON format.");
  await expect(card.locator("[data-card-link]")).toBeVisible();
  await expect(page.locator("#card-codeforces")).toHaveAttribute("data-state", "ready");
});

test("loads an approved KTOM snapshot without making any authenticated browser request", async ({ page }) => {
  const privateRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("ktom-tomi.or.id")) {
      privateRequests.push(request.url());
    }
  });
  await page.goto("/resume.html");
  const card = page.locator("#card-ktom");
  await expect(card).toHaveAttribute("data-state", "authentication-required");
  await page.route("**/data/resume/ktom.json", (route) => route.fulfill({
    json: publicSnapshot({
      fullName: "Nama KTOM",
      metadata: [{ label: "Skor", value: 42 }],
      updatedAt: "2026-10-13T15:00:00.000Z",
    }),
  }));
  await card.locator("[data-card-retry]").click();
  await expect(card).toHaveAttribute("data-state", "ready");
  await expect(card.locator("[data-card-name]")).toHaveText("Nama KTOM");
  await expect(card.locator("[data-card-metadata]")).toHaveText("Skor42");
  expect(privateRequests).toEqual([]);
});

test("uses English copy across Home and every Resume section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".skip-link")).toHaveText("Skip navigation");
  await expect(page.locator(".page-description")).toHaveText("A blank space to start again.");
  await expect(page.locator(".page-footer")).toContainText("A new beginning.");
  await page.goto("/resume.html#projects");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.locator("#projects .empty-state")).toHaveText(
    "Projects will be added later. We are starting with Cards.",
  );
  await page.getByRole("link", { name: "Page", exact: true }).click();
  await expect(page.locator("#resume-page .empty-state")).toHaveText(
    "The full resume page will be added later. We are starting with Cards.",
  );
  await page.getByRole("link", { name: "Cards", exact: true }).click();
  await expect(page.locator("#card-codeforces [data-card-source]")).toHaveText("Public API");
  await expect(page.locator("#card-codeforces [data-card-status]")).toHaveText("Public API loaded successfully.");
  await expect(page.locator("#card-codeforces [data-card-updated]")).toContainText("Updated");
  await expect(page.locator("#card-ktom [data-card-status]")).toHaveText(
    "Authentication required. Awaiting an approved public snapshot.",
  );
});

for (const width of [320, 390, 760, 761, 1024, 1440]) {
  test(`keeps cards and long custom metadata inside the viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/data/resume/linkedin.json", (route) => route.fulfill({
      json: publicSnapshot({
        fullName: "VeryLongPublicName".repeat(10),
        metadata: [{ label: "LongCustomMetadata".repeat(10), value: "LongCustomValue".repeat(10) }],
      }),
    }));
    await page.goto("/resume.html");
    await expect(page.locator("#card-linkedin")).toHaveAttribute("data-state", "ready");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const box of await page.locator(".profile-card").evaluateAll((cards) =>
      cards.map((card) => ({ left: card.getBoundingClientRect().left, right: card.getBoundingClientRect().right })),
    )) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(width);
    }
  });
}
