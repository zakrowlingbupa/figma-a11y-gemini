export type ExtractedNode = {
  id: string;
  name: string;
  type: SceneNode['type'];
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  fg?: [number, number, number] | null;
  bg?: [number, number, number] | null;
  role?: 'button' | 'link' | 'heading' | 'label' | 'input' | 'image' | 'other';
  parent?: string;
  children?: string[];
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

function guessRole(node: SceneNode): ExtractedNode['role'] {
  const nm = (node.name || '').toLowerCase();
  if (nm.includes('button') || nm.includes('btn')) return 'button';
  if (nm.includes('link')) return 'link';
  if (nm.startsWith('h1') || nm.startsWith('h2') || nm.startsWith('h3') || nm.includes('heading')) return 'heading';
  if (nm.includes('label')) return 'label';
  if (nm.includes('input') || nm.includes('field') || nm.includes('textbox')) return 'input';
  if (nm.includes('image') || node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'VECTOR') return 'image';
  return 'other';
}

export function extractContext(nodes: SceneNode[]): ExtractedNode[] {
  const results: ExtractedNode[] = [];

  const visit = (node: SceneNode) => {
    const obj: ExtractedNode = {
      id: node.id,
      name: node.name,
      type: node.type,
      parent: node.parent?.id,
      children: 'children' in node ? (node.children as SceneNode[]).map(n => n.id) : undefined,
    };

    if ('width' in node && 'height' in node) {
      obj.width = node.width; obj.height = node.height;
    }

    if (node.type === 'TEXT') {
      obj.text = (node.characters || '').slice(0, 200);
      try {
        const fontName = node.fontName as FontName;
        obj.fontFamily = (fontName as any)?.family || '';
        obj.fontSize = typeof node.fontSize === 'number' ? node.fontSize : undefined;
        const style = (fontName as any)?.style || '';
        obj.bold = typeof style === 'string' ? style.toLowerCase().includes('bold') : false;
      } catch {}
      obj.fg = solidColor(node);
      obj.bg = node.parent && 'fills' in node.parent ? solidColor(node.parent as SceneNode) : [255, 255, 255];
    } else {
      obj.fg = solidColor(node);
      obj.bg = node.parent && 'fills' in node.parent ? solidColor(node.parent as SceneNode) : [255, 255, 255];
    }

    obj.role = guessRole(node);
    results.push(obj);

    if ('children' in node) {
      for (const child of node.children as SceneNode[]) visit(child);
    }
  };

  for (const n of nodes) visit(n);
  return results;
}
