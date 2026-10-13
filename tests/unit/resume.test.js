import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const html = readFileSync(new URL("../../resume.html", import.meta.url), "utf8");
let dom;

async function start(hash = "") {
  dom.reconfigure({ url: `https://reiva5.github.io/resume.html${hash}` });
  await import("../../resume.js");
}

function navigate(hash) {
  dom.reconfigure({ url: `https://reiva5.github.io/resume.html${hash}` });
  window.dispatchEvent(new dom.window.HashChangeEvent("hashchange"));
}

beforeEach(() => {
  vi.resetModules();
  dom = new JSDOM(html, { url: "https://reiva5.github.io/resume.html" });
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
});

afterEach(() => {
  dom.window.close();
  vi.unstubAllGlobals();
});

describe("Resume navigation", () => {
  it("keeps all sections and their anchor targets available without JavaScript", () => {
    expect(document.querySelector("h1").textContent).toBe("Resume_");
    expect(document.querySelector('a[aria-current="page"]').textContent).toContain("Resume");
    expect(document.querySelectorAll("[data-resume-section]")).toHaveLength(3);
    document.querySelectorAll("[data-resume-view]").forEach((link) => {
      expect(document.querySelector(link.getAttribute("href")).hidden).toBe(false);
    });
  });

  it.each([
    ["", "cards", "Cards"],
    ["#cards", "cards", "Cards"],
    ["#projects", "projects", "Projects"],
    ["#resume-page", "resume-page", "Page"],
    ["#unknown", "cards", "Cards"],
  ])("opens %s with the correct section, title, breadcrumb, and current link", async (hash, id, title) => {
    await start(hash);
    expect(document.title).toBe(`${title} | Resume | reiva5`);
    expect(document.querySelector("[data-resume-breadcrumb]").textContent).toBe(
      `resume / ${title.toLowerCase()}`,
    );
    expect(Array.from(document.querySelectorAll("[data-resume-section]"), (section) => [
      section.id,
      section.hidden,
    ])).toEqual(["cards", "projects", "resume-page"].map((sectionId) => [sectionId, sectionId !== id]));
    expect(document.querySelectorAll('[aria-current="location"]')).toHaveLength(1);
    expect(document.querySelector('[aria-current="location"]').dataset.resumeView).toBe(id);
    expect(document.querySelector(".nav-sub-item-active").dataset.resumeView).toBe(id);
    expect(document.activeElement).toBe(document.body);
  });

  it("changes sections, moves focus, and restores Cards on an empty hash", async () => {
    await start();
    navigate("#projects");
    expect(document.activeElement.id).toBe("projects-title");
    expect(document.getElementById("cards").hidden).toBe(true);
    expect(document.getElementById("projects").hidden).toBe(false);
    navigate("#resume-page");
    expect(document.activeElement.id).toBe("resume-page-title");
    navigate("");
    expect(document.activeElement.id).toBe("cards-title");
    expect(document.getElementById("cards").hidden).toBe(false);
  });

  it("ignores unrelated hashes so the skip link does not reset the active section", async () => {
    await start("#projects");
    const main = document.getElementById("main-content");
    main.focus();
    navigate("#main-content");
    expect(document.getElementById("projects").hidden).toBe(false);
    expect(document.title).toBe("Projects | Resume | reiva5");
    expect(document.activeElement).toBe(main);
  });
});
