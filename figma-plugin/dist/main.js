"use strict";
(() => {
  // figma-plugin/src/extract.ts
  function to255(c) {
    return Math.round(c * 255);
  }
  function solidColor(node) {
    if ("fills" in node && node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const fill = node.fills.find((f) => f.type === "SOLID");
      if (fill && fill.color) {
        const c = fill.color;
        return [to255(c.r), to255(c.g), to255(c.b)];
      }
    }
    return null;
  }
  function guessRole(node) {
    const nm = (node.name || "").toLowerCase();
    if (nm.includes("button") || nm.includes("btn"))
      return "button";
    if (nm.includes("link"))
      return "link";
    if (nm.startsWith("h1") || nm.startsWith("h2") || nm.startsWith("h3") || nm.includes("heading"))
      return "heading";
    if (nm.includes("label"))
      return "label";
    if (nm.includes("input") || nm.includes("field") || nm.includes("textbox"))
      return "input";
    if (nm.includes("image") || node.type === "RECTANGLE" || node.type === "ELLIPSE" || node.type === "VECTOR")
      return "image";
    return "other";
  }
  function extractContext(nodes) {
    const results = [];
    const visit = (node) => {
      const obj = {
        id: node.id,
        name: node.name,
        type: node.type,
        parent: node.parent?.id,
        children: "children" in node ? node.children.map((n) => n.id) : void 0
      };
      if ("width" in node && "height" in node) {
        obj.width = node.width;
        obj.height = node.height;
      }
      if (node.type === "TEXT") {
        obj.text = (node.characters || "").slice(0, 200);
        try {
          const fontName = node.fontName;
          obj.fontFamily = fontName?.family || "";
          obj.fontSize = typeof node.fontSize === "number" ? node.fontSize : void 0;
          const style = fontName?.style || "";
          obj.bold = typeof style === "string" ? style.toLowerCase().includes("bold") : false;
        } catch {
        }
        obj.fg = solidColor(node);
        obj.bg = node.parent && "fills" in node.parent ? solidColor(node.parent) : [255, 255, 255];
      } else {
        obj.fg = solidColor(node);
        obj.bg = node.parent && "fills" in node.parent ? solidColor(node.parent) : [255, 255, 255];
      }
      obj.role = guessRole(node);
      results.push(obj);
      if ("children" in node) {
        for (const child of node.children)
          visit(child);
      }
    };
    for (const n of nodes)
      visit(n);
    return results;
  }

  // figma-plugin/src/contrast.ts
  function srgbToLinear(c) {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function relativeLuminance([r, g, b]) {
    const R = srgbToLinear(r);
    const G = srgbToLinear(g);
    const B = srgbToLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }
  function contrastRatio(fg, bg) {
    const L1 = relativeLuminance(fg);
    const L2 = relativeLuminance(bg);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  function isLargeText(fontSize, fontStyle) {
    if (!fontSize)
      return false;
    const bold = typeof fontStyle === "number" ? fontStyle >= 700 : String(fontStyle || "").toLowerCase().includes("bold");
    return fontSize >= 24 || bold && fontSize >= 19;
  }

  // figma-plugin/src/rules.ts
  function to2552(c) {
    return Math.round(c * 255);
  }
  function solidColor2(node) {
    if ("fills" in node && node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const fill = node.fills.find((f) => f.type === "SOLID");
      if (fill && fill.color) {
        const c = fill.color;
        return [to2552(c.r), to2552(c.g), to2552(c.b)];
      }
    }
    return null;
  }
  function nodeBackgroundApprox(node) {
    let p = node.parent;
    while (p) {
      if ("fills" in p && p.fills && Array.isArray(p.fills)) {
        const solid = p.fills.find((f) => f.type === "SOLID");
        if (solid && solid.color) {
          const c = solid.color;
          return [to2552(c.r), to2552(c.g), to2552(c.b)];
        }
      }
      p = p.parent;
    }
    return [255, 255, 255];
  }
  function checkContrast(node) {
    const issues = [];
    if (node.type !== "TEXT")
      return issues;
    const fg = solidColor2(node);
    const bg = nodeBackgroundApprox(node);
    if (!fg || !bg)
      return issues;
    const ratio = contrastRatio(fg, bg);
    let fontSize;
    try {
      fontSize = typeof node.fontSize === "number" ? node.fontSize : void 0;
    } catch {
      fontSize = void 0;
    }
    let style;
    try {
      style = node.fontName?.style;
    } catch {
      style = void 0;
    }
    const large = isLargeText(fontSize, style);
    const threshold = large ? 3 : 4.5;
    if (ratio < threshold) {
      issues.push({
        id: node.id,
        nodeName: node.name,
        severity: "error",
        guideline: large ? "WCAG 1.4.3 Contrast (Minimum) \u2014 Large Text \u2265 3:1" : "WCAG 1.4.3 Contrast (Minimum) \u2014 Body Text \u2265 4.5:1",
        summary: `Low contrast: ${ratio.toFixed(2)}:1 (needs \u2265 ${threshold}:1)`,
        suggestion: "Increase foreground contrast or adjust background color. Consider brand token variants with sufficient contrast."
      });
    }
    return issues;
  }
  function checkTouchTarget(node) {
    const issues = [];
    const name = (node.name || "").toLowerCase();
    const isLikelyInteractive = name.includes("button") || name.includes("btn") || name.includes("link") || node.type === "COMPONENT" || node.type === "INSTANCE";
    if (!isLikelyInteractive || !("width" in node) || !("height" in node))
      return issues;
    const min = 24;
    if (node.width < min || node.height < min) {
      issues.push({
        id: node.id,
        nodeName: node.name,
        severity: "warning",
        guideline: "WCAG 2.5.8 Target Size (Minimum) / Design BP \u2265 24\xD724px",
        summary: `Small touch target (${Math.round(node.width)}\xD7${Math.round(node.height)}px).`,
        suggestion: "Increase target size to at least 24\xD724px and ensure 8\u201316px spacing to adjacent targets."
      });
    }
    return issues;
  }
  function checkLinks(node) {
    const issues = [];
    if (node.type !== "TEXT")
      return issues;
    const name = (node.name || "").toLowerCase();
    const textStr = node.characters || "";
    const looksLikeLink = name.includes("link") || /\bhttps?:\/\/|^www\./i.test(textStr);
    if (looksLikeLink) {
      issues.push({
        id: node.id,
        nodeName: node.name,
        severity: "info",
        guideline: "WCAG 1.4.1 Use of Color / Design note: Links underlined in body text",
        summary: "Link styling should not rely on color alone.",
        suggestion: "Ensure underline or an alternative highly perceivable cue (e.g., '>' in apps) for links in body copy."
      });
    }
    return issues;
  }
  function checkHeadingHierarchy(node) {
    const issues = [];
    if (node.type !== "TEXT")
      return issues;
    const nm = (node.name || "").toLowerCase();
    const isHeading = nm.startsWith("h1") || nm.startsWith("h2") || nm.startsWith("h3") || nm.includes("heading");
    if (isHeading) {
      issues.push({
        id: node.id,
        nodeName: node.name,
        severity: "info",
        guideline: "WCAG 2.4.6 Headings and Labels / Maintain hierarchy + proximity",
        summary: "Confirm heading level and proximity reflect hierarchy.",
        suggestion: "Ensure heading level matches its role (H1/H2/H3), placed closer to related content than prior block."
      });
    }
    return issues;
  }
  function runDeterministicChecks(node) {
    return [
      ...checkContrast(node),
      ...checkTouchTarget(node),
      ...checkLinks(node),
      ...checkHeadingHierarchy(node)
    ];
  }

  // figma-plugin/src/prompt.ts
  function buildPrompt(extracted, deterministicIssues, options) {
    const houseRules = `
You are an accessibility expert reviewing a Figma design for WCAG 2.x and the following design standards. Provide precise, practical annotations with suggested fixes.

KEY HOUSE RULES (design system):
- Contrast: body text \u2265 4.5:1, large text \u2265 3:1. Non-text UI (borders, focus indicators) \u2265 3:1.
- Links in body text must not rely on color alone; underline (HTML) or perceivable alternative in apps (e.g., '>').
- Base body text \u2265 16px (14px minimum for small text). Use plain fonts with distinguishable glyphs (e.g., Il1!).
- Line length \u2264 80 characters. Left-align text. Line spacing \u2265 1.5\xD7, paragraph spacing \u2265 1.5\xD7 line spacing.
- Headings reflect hierarchy visually and semantically. Proximity to related content, not preceding blocks.
- Buttons used for actions; links for navigation. Buttons have descriptive text. Touch targets \u2265 24\xD724px with 8\u201316px spacing.
- Focus/hover/active states must be visible and not color-only. Provide keyboard access and pointer alternatives.
- Tables: clear headers, captions, simple structure (no merged cells) where possible.
- Carousels: no auto-play; controls with item count.
- Forms: visible labels near inputs, required/optional clearly indicated; helpful error messages; multi-step indicators when applicable.

Map guidance to WCAG 2.x SCs (e.g., 1.4.3, 1.4.11, 2.4.6, 2.5.8, 3.3.x, 3.2.4).

Return JSON ONLY matching this schema:
{
  "annotations": [
    {
      "nodeId": "string",
      "severity": "error" | "warning" | "info",
      "guideline": "string",
      "message": "string",
      "suggestion": "string",
      "evidence": { "snippet"?: "string", "ratio"?: "number", "examples"?: "string[]" }
    }
  ],
  "summary": "string",
  "notices": "string[]"
}

Be concise but specific. Prioritize high-severity issues. Avoid duplicates of deterministic checks unless adding contextual nuance.`;
    return [
      {
        role: "user",
        parts: [
          { text: `Page: ${options.pageName}` },
          { text: houseRules },
          { text: "DETERMINISTIC_ISSUES:" },
          { text: JSON.stringify(deterministicIssues).slice(0, 8e3) },
          { text: "EXTRACTED_CONTEXT (truncated):" },
          { text: JSON.stringify(extracted).slice(0, 8e3) }
        ]
      }
    ];
  }

  // figma-plugin/src/gemini.ts
  async function askGemini(messages, opts) {
    const proxyUrl = opts?.proxyUrl || "https://your-deployment.vercel.app/api/gemini";
    const resp = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, model: opts?.model || "gemini-1.5-pro-latest" })
    });
    if (!resp.ok)
      throw new Error(`Proxy error: ${resp.status}`);
    const { text } = await resp.json();
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}$/);
      if (match)
        return JSON.parse(match[0]);
      throw new Error("Model did not return valid JSON");
    }
  }

  // figma-plugin/src/main.ts
  figma.showUI(__html__, { width: 420, height: 560 });
  function collectScopeNodes() {
    if (figma.currentPage.selection.length) {
      return figma.currentPage.selection;
    }
    return figma.currentPage.children;
  }
  function collectAllDescendants(nodes) {
    const out = [];
    const visit = (n) => {
      out.push(n);
      if ("children" in n)
        n.children.forEach(visit);
    };
    nodes.forEach(visit);
    return out;
  }
  figma.ui.onmessage = async (msg) => {
    try {
      if (msg.type === "scan") {
        const scopeNodes = collectScopeNodes();
        const all = collectAllDescendants(scopeNodes);
        const extracted = extractContext(scopeNodes);
        const detIssues = [];
        for (const n of all)
          detIssues.push(...runDeterministicChecks(n));
        const prompt = buildPrompt(extracted, detIssues, { pageName: figma.currentPage.name });
        const result = await askGemini(prompt, { proxyUrl: msg.proxyUrl });
        figma.ui.postMessage({ type: "scan-result", extractedCount: extracted.length, detIssues, model: result });
      }
      if (msg.type === "annotate") {
        const { annotations } = msg.payload || {};
        if (!annotations)
          return;
        try {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        } catch {
        }
        for (const ann of annotations) {
          const node = figma.getNodeById(ann.nodeId);
          if (!node)
            continue;
          try {
            node.setPluginData("a11yAnnotation", JSON.stringify(ann));
          } catch {
          }
          let absX = 0, absY = 0, width = 0;
          try {
            const m = node.absoluteTransform;
            absX = m[0][2];
            absY = m[1][2];
            width = "width" in node ? node.width : 0;
          } catch {
          }
          const frame = figma.createFrame();
          frame.name = `A11y: ${ann.severity.toUpperCase()} \u2014 ${ann.guideline}`;
          frame.resize(340, 120);
          frame.x = absX + width + 24;
          frame.y = absY;
          frame.fills = [{ type: "SOLID", color: { r: 1, g: 0.95, b: 0.8 } }];
          frame.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.7, b: 0.2 } }];
          frame.strokeWeight = 1;
          frame.layoutMode = "VERTICAL";
          frame.counterAxisSizingMode = "AUTO";
          frame.primaryAxisSizingMode = "AUTO";
          frame.paddingLeft = frame.paddingRight = frame.paddingTop = frame.paddingBottom = 12;
          frame.itemSpacing = 8;
          const title = figma.createText();
          title.fontName = { family: "Inter", style: "Regular" };
          title.fontSize = 12;
          title.characters = `${ann.message}`;
          const suggestion = figma.createText();
          suggestion.fontName = { family: "Inter", style: "Regular" };
          suggestion.fontSize = 11;
          suggestion.characters = `Suggestion: ${ann.suggestion || "\u2014"}`;
          frame.appendChild(title);
          frame.appendChild(suggestion);
          figma.currentPage.appendChild(frame);
        }
        figma.ui.postMessage({ type: "annotate-complete", count: annotations.length });
      }
      if (msg.type === "clear-annotations") {
        const nodesWithData = figma.currentPage.findAll((n) => !!n.getPluginData("a11yAnnotation"));
        for (const n of nodesWithData)
          n.setPluginData("a11yAnnotation", "");
        const callouts = figma.currentPage.findAll((n) => n.name.startsWith("A11y: "));
        for (const c of callouts)
          c.remove();
        figma.ui.postMessage({ type: "cleared" });
      }
    } catch (err) {
      figma.ui.postMessage({ type: "error", message: err?.message || String(err) });
    }
  };
})();
//# sourceMappingURL=main.js.map
