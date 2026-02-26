import { extractContext } from './extract';
import { runDeterministicChecks, type Issue } from './rules';
import { buildPrompt } from './prompt';
import { askGemini } from './gemini';

figma.showUI(__html__, { width: 420, height: 560 });

type Annotation = {
  nodeId: string;
  severity: 'error' | 'warning' | 'info';
  guideline: string;
  message: string;
  suggestion?: string;
  evidence?: { snippet?: string; ratio?: number; examples?: string[] };
};

function collectScopeNodes(): SceneNode[] {
  if (figma.currentPage.selection.length) {
    return figma.currentPage.selection as SceneNode[];
  }
  return figma.currentPage.children as SceneNode[];
}

function collectAllDescendants(nodes: SceneNode[]): SceneNode[] {
  const out: SceneNode[] = [];
  const visit = (n: SceneNode) => {
    out.push(n);
    if ('children' in n) (n.children as SceneNode[]).forEach(visit);
  };
  nodes.forEach(visit);
  return out;
}

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'scan') {
      const scopeNodes = collectScopeNodes();
      const all = collectAllDescendants(scopeNodes);

      const extracted = extractContext(scopeNodes);

      const detIssues: Issue[] = [];
      for (const n of all) detIssues.push(...runDeterministicChecks(n));

      const prompt = buildPrompt(extracted, detIssues, { pageName: figma.currentPage.name });
      const result = await askGemini(prompt, { proxyUrl: msg.proxyUrl });

      figma.ui.postMessage({ type: 'scan-result', extractedCount: extracted.length, detIssues, model: result });
    }

    if (msg.type === 'annotate') {
      const { annotations } = msg.payload || {} as { annotations: Annotation[] };
      if (!annotations) return;

      // Ensure font before creating text nodes
      try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); } catch {}

      for (const ann of annotations) {
        const node = figma.getNodeById(ann.nodeId) as SceneNode | null;
        if (!node) continue;

        // Persist structured data on node
        try { node.setPluginData('a11yAnnotation', JSON.stringify(ann)); } catch {}

        // Compute absolute position
        let absX = 0, absY = 0, width = 0;
        try {
          const m = (node as any).absoluteTransform as Transform;
          absX = m[0][2];
          absY = m[1][2];
          width = 'width' in node ? (node as any).width : 0;
        } catch {}

        const frame = figma.createFrame();
        frame.name = `A11y: ${ann.severity.toUpperCase()} — ${ann.guideline}`;
        frame.resize(340, 120);
        frame.x = absX + width + 24;
        frame.y = absY;
        frame.fills = [{ type: 'SOLID', color: { r: 1, g: 0.95, b: 0.8 } }];
        frame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.7, b: 0.2 } }];
        frame.strokeWeight = 1;
        frame.layoutMode = 'VERTICAL';
        frame.counterAxisSizingMode = 'AUTO';
        frame.primaryAxisSizingMode = 'AUTO';
        frame.paddingLeft = frame.paddingRight = frame.paddingTop = frame.paddingBottom = 12;
        frame.itemSpacing = 8;

        const title = figma.createText();
        title.fontName = { family: 'Inter', style: 'Regular' };
        title.fontSize = 12;
        title.characters = `${ann.message}`;

        const suggestion = figma.createText();
        suggestion.fontName = { family: 'Inter', style: 'Regular' };
        suggestion.fontSize = 11;
        suggestion.characters = `Suggestion: ${ann.suggestion || '—'}`;

        frame.appendChild(title);
        frame.appendChild(suggestion);

        figma.currentPage.appendChild(frame);
      }

      figma.ui.postMessage({ type: 'annotate-complete', count: annotations.length });
    }

    if (msg.type === 'clear-annotations') {
      const nodesWithData = figma.currentPage.findAll(n => !!n.getPluginData('a11yAnnotation'));
      for (const n of nodesWithData) n.setPluginData('a11yAnnotation', '');

      const callouts = figma.currentPage.findAll(n => n.name.startsWith('A11y: '));
      for (const c of callouts) c.remove();
      figma.ui.postMessage({ type: 'cleared' });
    }
  } catch (err: any) {
    figma.ui.postMessage({ type: 'error', message: err?.message || String(err) });
  }
};
