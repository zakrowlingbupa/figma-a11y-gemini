// Utility for luminance and contrast ratio
function srgbToLinear(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isLargeText(fontSize: number | undefined, fontStyle: string | number | undefined): boolean {
  if (!fontSize) return false;
  const bold = typeof fontStyle === 'number' ? fontStyle >= 700 : (String(fontStyle || '').toLowerCase().includes('bold'));
  return fontSize >= 24 || (bold && fontSize >= 19);
}
