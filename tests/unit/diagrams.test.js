import { chromium } from "@playwright/test";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withDiagramRenderer } from "../../scripts/diagrams.mjs";

function setup() {
  const abort = vi.fn();
  const page = {
    route: vi.fn(async (pattern, handler) => handler({ abort })),
    setContent: vi.fn(),
    addScriptTag: vi.fn(),
    evaluate: vi.fn(async (callback, argument) => callback(argument)),
  };
  const browser = { newPage: vi.fn(async () => page), close: vi.fn() };
  const mermaid = {
    initialize: vi.fn(),
    render: vi.fn(async (id, source) => ({ svg: `<svg id="${id}">${source}</svg>` })),
  };
  const dom = new JSDOM("");
  dom.window.mermaid = mermaid;
  vi.stubGlobal("window", dom.window);
  vi.stubGlobal("document", dom.window.document);
  vi.stubGlobal("XMLSerializer", dom.window.XMLSerializer);
  return { page, browser, mermaid, abort };
}

afterEach(() => {
  window.close();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("build-only Mermaid renderer", () => {
  it("uses the installed browser, blocks network access, and returns SVG using the site's palette", async () => {
    const { browser, page, mermaid, abort } = setup();
    const launch = vi.spyOn(chromium, "launch").mockResolvedValue(browser);
    const result = await withDiagramRenderer(async (render) => render("flowchart LR; A --> B", 1));
    expect(launch).toHaveBeenCalledOnce();
    expect(page.addScriptTag.mock.calls[0][0].path).toMatch(/mermaid[/\\]dist[/\\]mermaid\.min\.js$/);
    expect(abort).toHaveBeenCalledOnce();
    expect(mermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({
      securityLevel: "strict",
      themeVariables: expect.objectContaining({ primaryBorderColor: "#3d5f58" }),
    }));
    expect(mermaid.render).toHaveBeenCalledWith("diagram-1", "flowchart LR; A --> B");
    expect(result).toContain('id="diagram-1"');
    expect(() => new JSDOM(result, { contentType: "image/svg+xml" })).not.toThrow();
    expect(browser.close).toHaveBeenCalledOnce();
  });

  it("closes Chromium and propagates invalid-diagram errors", async () => {
    const { browser, mermaid } = setup();
    mermaid.render.mockRejectedValue(new Error("Parse failed"));
    await expect(withDiagramRenderer(async (render) => render("broken", 2), async () => browser))
      .rejects.toThrow("Parse failed");
    expect(browser.close).toHaveBeenCalledOnce();
  });

  it("serializes HTML line breaks into valid XML for standalone SVG images", async () => {
    const { browser, mermaid } = setup();
    mermaid.render.mockResolvedValue({
      svg: "<svg><foreignObject><div>First<br>Second</div></foreignObject></svg>",
    });
    const svg = await withDiagramRenderer(async (render) => render("flowchart LR", 1), async () => browser);
    const xml = new JSDOM(svg, { contentType: "image/svg+xml" });
    expect(xml.window.document.querySelector("br")).not.toBeNull();
    xml.window.close();
    mermaid.render.mockResolvedValue({ svg: "<div>Not an SVG</div>" });
    await expect(withDiagramRenderer(async (render) => render("broken", 2), async () => browser))
      .rejects.toThrow("Diagram 2 did not produce an SVG");
  });

  it("closes Chromium when setup fails and reports launch errors", async () => {
    const { browser } = setup();
    browser.newPage.mockRejectedValue(new Error("Page unavailable"));
    await expect(withDiagramRenderer(vi.fn(), async () => browser)).rejects.toThrow("Page unavailable");
    expect(browser.close).toHaveBeenCalledOnce();
    await expect(withDiagramRenderer(vi.fn(), async () => { throw new Error("Chromium missing"); }))
      .rejects.toThrow("Chromium missing");
  });
});
