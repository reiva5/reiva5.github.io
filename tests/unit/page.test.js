import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
let dom;
let media;
let mediaListeners;

const element = (id) => document.getElementById(id);

async function start(mobile = false) {
  media.matches = mobile;
  await import("../../script.js");
}

function changeViewport(mobile) {
  media.matches = mobile;
  mediaListeners.forEach((listener) => listener({ matches: mobile }));
}

function pressKey(key, shiftKey = false) {
  const event = new dom.window.KeyboardEvent("keydown", {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  vi.resetModules();
  dom = new JSDOM(html, { url: "https://reiva5.github.io/" });
  mediaListeners = new Set();
  media = {
    matches: false,
    addEventListener: vi.fn((type, listener) => {
      if (type === "change") {
        mediaListeners.add(listener);
      }
    }),
  };
  dom.window.matchMedia = vi.fn(() => media);
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
});

afterEach(() => {
  dom.window.close();
  vi.unstubAllGlobals();
});

describe("page scaffold", () => {
  it("provides the Home landmark, active link, and empty content", async () => {
    await start();
    expect(document.documentElement.lang).toBe("id");
    expect(document.querySelector("main").id).toBe("main-content");
    expect(document.querySelector(".skip-link").getAttribute("href")).toBe("#main-content");
    expect(document.querySelector("h1").textContent).toBe("Home_");
    const home = document.querySelector('nav a[aria-current="page"]');
    expect(home.getAttribute("href")).toBe("./");
    expect(document.querySelector(".empty-state").textContent).toContain("Belum ada konten.");
    expect(document.querySelectorAll("nav .nav-item")).toHaveLength(2);
  });

  it("keeps Resume disabled without a navigation target or click event", async () => {
    await start();
    const resume = document.querySelector(".nav-item-disabled");
    const onClick = vi.fn();
    resume.addEventListener("click", onClick);
    const url = window.location.href;
    resume.click();
    expect(resume.disabled).toBe(true);
    expect(resume.hasAttribute("href")).toBe(false);
    expect(resume.getAttribute("aria-describedby")).toBe("resume-note");
    expect(onClick).not.toHaveBeenCalled();
    expect(window.location.href).toBe(url);
  });

  it("keeps script-dependent controls hidden before initialization", () => {
    expect(element("menu-toggle").hidden).toBe(true);
    expect(element("sidebar-close").hidden).toBe(true);
    expect(element("sidebar-backdrop").hidden).toBe(true);
  });
});

describe("desktop sidebar", () => {
  it("starts expanded with exposed controls and no modal state", async () => {
    await start();
    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 760px)");
    expect(media.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(element("site-shell").dataset.sidebarOpen).toBe("true");
    expect(element("sidebar").hidden).toBe(false);
    expect(element("menu-toggle").hidden).toBe(false);
    expect(element("sidebar-close").hidden).toBe(false);
    expect(element("menu-toggle").getAttribute("aria-expanded")).toBe("true");
    expect(element("menu-toggle").getAttribute("aria-label")).toBe("Sembunyikan menu");
    expect(element("sidebar-close").getAttribute("aria-label")).toBe("Sembunyikan menu");
    expect(element("sidebar").hasAttribute("role")).toBe(false);
    expect(element("sidebar").hasAttribute("aria-modal")).toBe(false);
    expect(element("sidebar-backdrop").hidden).toBe(true);
    expect(element("page").inert).toBe(false);
    expect(document.body.classList.contains("menu-open")).toBe(false);
  });

  it("collapses and expands with synchronized labels and focus", async () => {
    await start();
    const toggle = element("menu-toggle");
    toggle.click();
    expect(element("site-shell").dataset.sidebarOpen).toBe("false");
    expect(element("sidebar").hidden).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe("Tampilkan menu");
    expect(toggle.title).toBe("Tampilkan menu");
    expect(document.activeElement).toBe(toggle);
    toggle.click();
    expect(element("sidebar").hidden).toBe(false);
    expect(toggle.title).toBe("Sembunyikan menu");
    expect(document.activeElement).toBe(toggle);
  });

  it("closes using the sidebar button and remembers the collapsed desktop preference", async () => {
    await start();
    element("sidebar-close").click();
    expect(document.activeElement).toBe(element("menu-toggle"));
    changeViewport(true);
    changeViewport(false);
    expect(element("sidebar").hidden).toBe(true);
  });

  it("closes on Escape and remembers that preference across breakpoints", async () => {
    await start();
    expect(pressKey("Escape").defaultPrevented).toBe(true);
    expect(element("sidebar").hidden).toBe(true);
    changeViewport(true);
    changeViewport(false);
    expect(element("sidebar").hidden).toBe(true);
  });

  it("does not intercept Tab, Shift+Tab, or unrelated keys on desktop", async () => {
    await start();
    const brand = document.querySelector(".brand");
    brand.focus();
    expect(pressKey("Tab").defaultPrevented).toBe(false);
    expect(pressKey("Tab", true).defaultPrevented).toBe(false);
    expect(pressKey("ArrowDown").defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(brand);
    expect(element("sidebar").hidden).toBe(false);
  });
});

describe("mobile drawer", () => {
  it("starts closed and non-modal", async () => {
    await start(true);
    expect(element("site-shell").dataset.sidebarOpen).toBe("false");
    expect(element("sidebar").hidden).toBe(true);
    expect(element("menu-toggle").getAttribute("aria-expanded")).toBe("false");
    expect(element("menu-toggle").getAttribute("aria-label")).toBe("Tampilkan menu");
    expect(element("sidebar-close").getAttribute("aria-label")).toBe("Tutup menu");
    expect(element("sidebar").hasAttribute("aria-modal")).toBe(false);
    expect(element("page").inert).toBe(false);
    expect(element("sidebar-backdrop").hidden).toBe(true);
  });

  it("opens a labeled dialog, isolates the page, and focuses the close control", async () => {
    await start(true);
    element("menu-toggle").click();
    expect(element("sidebar").hidden).toBe(false);
    expect(element("sidebar").getAttribute("role")).toBe("dialog");
    expect(element("sidebar").getAttribute("aria-modal")).toBe("true");
    expect(element("sidebar").getAttribute("aria-labelledby")).toBe("sidebar-brand");
    expect(element("page").inert).toBe(true);
    expect(element("sidebar-backdrop").hidden).toBe(false);
    expect(document.body.classList.contains("menu-open")).toBe(true);
    expect(document.activeElement).toBe(element("sidebar-close"));
    expect(element("menu-toggle").getAttribute("aria-expanded")).toBe("true");
  });

  it.each(["sidebar-close", "sidebar-backdrop"])("closes via %s and restores the page and focus", async (control) => {
    await start(true);
    element("menu-toggle").click();
    element(control).click();
    expect(element("sidebar").hidden).toBe(true);
    expect(element("sidebar").hasAttribute("role")).toBe(false);
    expect(element("sidebar").hasAttribute("aria-modal")).toBe(false);
    expect(element("page").inert).toBe(false);
    expect(element("sidebar-backdrop").hidden).toBe(true);
    expect(document.body.classList.contains("menu-open")).toBe(false);
    expect(document.activeElement).toBe(element("menu-toggle"));
  });

  it("closes on Escape and allows Escape to propagate when already closed", async () => {
    await start(true);
    element("menu-toggle").click();
    expect(pressKey("Escape").defaultPrevented).toBe(true);
    expect(element("sidebar").hidden).toBe(true);
    expect(document.activeElement).toBe(element("menu-toggle"));
    expect(pressKey("Escape").defaultPrevented).toBe(false);
  });

  it("does not trap any keyboard input while closed", async () => {
    await start(true);
    const toggle = element("menu-toggle");
    toggle.focus();
    expect(pressKey("Tab").defaultPrevented).toBe(false);
    expect(pressKey("Tab", true).defaultPrevented).toBe(false);
    expect(pressKey("ArrowDown").defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });

  it("wraps forward Tab from the last enabled item to the brand", async () => {
    await start(true);
    element("menu-toggle").click();
    const home = document.querySelector(".nav-item-active");
    home.focus();
    expect(pressKey("Tab").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(document.querySelector(".brand"));
  });

  it("wraps Shift+Tab from the brand to Home, skipping disabled Resume", async () => {
    await start(true);
    element("menu-toggle").click();
    document.querySelector(".brand").focus();
    expect(pressKey("Tab", true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(document.querySelector(".nav-item-active"));
  });

  it("does not intercept ordinary Tab navigation or unrelated keys inside the drawer", async () => {
    await start(true);
    element("menu-toggle").click();
    expect(pressKey("Tab").defaultPrevented).toBe(false);
    expect(pressKey("Tab", true).defaultPrevented).toBe(false);
    expect(pressKey("Enter").defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(element("sidebar-close"));
  });
});

describe("viewport transitions", () => {
  it("closes on entering mobile and restores focus if navigation had focus", async () => {
    await start();
    document.querySelector(".brand").focus();
    changeViewport(true);
    expect(element("sidebar").hidden).toBe(true);
    expect(document.activeElement).toBe(element("menu-toggle"));
    expect(element("sidebar-close").getAttribute("aria-label")).toBe("Tutup menu");
  });

  it("does not steal focus from page content when entering mobile", async () => {
    await start();
    const main = element("main-content");
    main.focus();
    changeViewport(true);
    expect(element("sidebar").hidden).toBe(true);
    expect(document.activeElement).toBe(main);
  });

  it("removes mobile modal state when returning to an expanded desktop", async () => {
    await start(true);
    element("menu-toggle").click();
    changeViewport(false);
    expect(element("sidebar").hidden).toBe(false);
    expect(element("sidebar").hasAttribute("role")).toBe(false);
    expect(element("sidebar").hasAttribute("aria-modal")).toBe(false);
    expect(element("page").inert).toBe(false);
    expect(element("sidebar-backdrop").hidden).toBe(true);
    expect(document.body.classList.contains("menu-open")).toBe(false);
    expect(element("sidebar-close").getAttribute("aria-label")).toBe("Sembunyikan menu");
  });

  it("does not replace an expanded desktop preference when the mobile drawer is closed", async () => {
    await start();
    changeViewport(true);
    element("menu-toggle").click();
    element("sidebar-close").click();
    changeViewport(false);
    expect(element("sidebar").hidden).toBe(false);
  });

  it("restores focus when an open mobile drawer returns to a collapsed desktop", async () => {
    await start();
    element("menu-toggle").click();
    changeViewport(true);
    element("menu-toggle").click();
    document.querySelector(".nav-item-active").focus();
    changeViewport(false);
    expect(element("sidebar").hidden).toBe(true);
    expect(document.activeElement).toBe(element("menu-toggle"));
    expect(element("page").inert).toBe(false);
  });

  it("preserves a reopened desktop preference across a mobile visit", async () => {
    await start();
    element("menu-toggle").click();
    element("menu-toggle").click();
    changeViewport(true);
    changeViewport(false);
    expect(element("sidebar").hidden).toBe(false);
  });
});
