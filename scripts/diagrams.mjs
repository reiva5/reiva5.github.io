import { chromium } from "@playwright/test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export async function withDiagramRenderer(consume, launch = () => chromium.launch()) {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.route("**/*", (route) => route.abort());
    await page.setContent('<!doctype html><html lang="en"><body></body></html>');
    await page.addScriptTag({ path: require.resolve("mermaid/dist/mermaid.min.js") });
    await page.evaluate(() => window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      htmlLabels: false,
      theme: "base",
      fontFamily: "Arial, sans-serif",
      themeVariables: {
        primaryColor: "#f2f2eb",
        primaryTextColor: "#10201d",
        primaryBorderColor: "#3d5f58",
        secondaryColor: "#8bb2de",
        tertiaryColor: "#e97b77",
        lineColor: "#3d5f58",
        background: "#f7f7f2",
      },
      flowchart: { htmlLabels: false, useMaxWidth: false },
      sequence: { useMaxWidth: false },
    }));
    return await consume(async (source, id) => page.evaluate(async ({ source, id }) => {
      const { svg } = await window.mermaid.render(`diagram-${id}`, source);
      const container = document.createElement("div");
      container.innerHTML = svg;
      const element = container.querySelector("svg");
      if (!element) {
        throw new Error(`Diagram ${id} did not produce an SVG`);
      }
      return new XMLSerializer().serializeToString(element);
    }, { source, id }));
  } finally {
    await browser.close();
  }
}
