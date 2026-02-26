import { contrastRatio, isLargeText } from './contrast';

export type Issue = {
  id: string;
  nodeName: string;
  severity: 'error' | 'warning' | 'info';
  guideline: string;
  summary: string;
  details?: string;
  suggestion?: string;
};

type RGB = { r: number; g: number; b: number };

function to255(c: number) { return Math.round(c * 255); }

function solidColor(node: SceneNode): [number, number, number] | null {
  if ('fills' in node && node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
    const fill = (node.fills as readonly Paint[]).find(f => (f as SolidPaint).type === 'SOLID') as SolidPaint | undefined;
    if (fill && fill.color) {
      const c = fill.color as RGB;
      return [to255(c.r), to255(c.g), to255(c.b)];
    }
  }
  return null;
}

function nodeBackgroundApprox(node: SceneNode): [number, number, number] | null {
  let p = node.parent;
  while (p) {
    if ('fills' in p && p.fills && Array.isArray(p.fills)) {
      const solid = (p.fills as readonly Paint[]).find(f => (f as SolidPaint).type === 'SOLID') as SolidPaint | undefined;
      if (solid && solid.color) {
        const c = solid.color as RGB;
        return [to255(c.r), to255(c.g), to255(c.b)];
      }
    }
    p = p.parent;
  }
  return [255, 255, 255];
}

export function checkContrast(node: SceneNode): Issue[] {
  const issues: Issue[] = [];
  if (node.type !== 'TEXT') return issues;

  const fg = solidColor(node);
  const bg = nodeBackgroundApprox(node);
  if (!fg || !bg) return issues;

  const ratio = contrastRatio(fg, bg);

  let fontSize: number | undefined;
  try { fontSize = typeof node.fontSize === 'number' ? node.fontSize : undefined; } catch { fontSize = undefined; }
  let style: string | number | undefined;
  try { style = (node.fontName as FontName)?.style; } catch { style = undefined; }

  const large = isLargeText(fontSize, style);
  const threshold = large ? 3.0 : 4.5;

  if (ratio < threshold) {
    issues.push({
      id: node.id,
      nodeName: node.name,
      severity: 'error',
      guideline: large ? 'WCAG 1.4.3 Contrast (Minimum) — Large Text ≥ 3:1' : 'WCAG 1.4.3 Contrast (Minimum) — Body Text ≥ 4.5:1',
      summary: `Low contrast: ${ratio.toFixed(2)}:1 (needs ≥ ${threshold}:1)`,
      suggestion: 'Increase foreground contrast or adjust background color. Consider brand token variants with sufficient contrast.'
    });
  }
  return issues;
}

export function checkTouchTarget(node: SceneNode): Issue[] {
  const issues: Issue[] = [];
  const name = (node.name || '').toLowerCase();
  const isLikelyInteractive = name.includes('button') || name.includes('btn') || name.includes('link') || node.type === 'COMPONENT' || node.type === 'INSTANCE';

  if (!isLikelyInteractive || !('width' in node) || !('height' in node)) return issues;

  const min = 24;
  if (node.width < min || node.height < min) {
    issues.push({
      id: node.id,
      nodeName: node.name,
      severity: 'warning',
      guideline: 'WCAG 2.5.8 Target Size (Minimum) / Design BP ≥ 24×24px',
      summary: `Small touch target (${Math.round(node.width)}×${Math.round(node.height)}px).`,
      suggestion: 'Increase target size to at least 24×24px and ensure 8–16px spacing to adjacent targets.'
    });
  }
  return issues;
}

export function checkLinks(node: SceneNode): Issue[] {
  const issues: Issue[] = [];
  if (node.type !== 'TEXT') return issues;

  const name = (node.name || '').toLowerCase();
  const textStr = node.characters || '';
  const looksLikeLink = name.includes('link') || /\bhttps?:\/\/|^www\./i.test(textStr);

  if (looksLikeLink) {
    issues.push({
      id: node.id,
      nodeName: node.name,
      severity: 'info',
      guideline: 'WCAG 1.4.1 Use of Color / Design note: Links underlined in body text',
      summary: 'Link styling should not rely on color alone.',
      suggestion: "Ensure underline or an alternative highly perceivable cue (e.g., '>' in apps) for links in body copy."
    });
  }
  return issues;
}

export function checkHeadingHierarchy(node: SceneNode): Issue[] {
  const issues: Issue[] = [];
  if (node.type !== 'TEXT') return issues;
  const nm = (node.name || '').toLowerCase();
  const isHeading = nm.startsWith('h1') || nm.startsWith('h2') || nm.startsWith('h3') || nm.includes('heading');
  if (isHeading) {
    issues.push({
      id: node.id,
      nodeName: node.name,
      severity: 'info',
      guideline: 'WCAG 2.4.6 Headings and Labels / Maintain hierarchy + proximity',
      summary: 'Confirm heading level and proximity reflect hierarchy.',
      suggestion: 'Ensure heading level matches its role (H1/H2/H3), placed closer to related content than prior block.'
    });
  }
  return issues;
}

export function runDeterministicChecks(node: SceneNode): Issue[] {
  return [
    ...checkContrast(node),
    ...checkTouchTarget(node),
    ...checkLinks(node),
    ...checkHeadingHierarchy(node),
  ];
}
