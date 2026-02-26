import type { Issue } from './rules';

export function buildPrompt(
  extracted: any[],
  deterministicIssues: Issue[],
  options: { pageName: string }
) {
  const houseRules = `
You are an accessibility expert reviewing a Figma design for WCAG 2.x and the following design standards. Provide precise, practical annotations with suggested fixes.

KEY HOUSE RULES (design system):
- Contrast: body text ≥ 4.5:1, large text ≥ 3:1. Non-text UI (borders, focus indicators) ≥ 3:1.
- Links in body text must not rely on color alone; underline (HTML) or perceivable alternative in apps (e.g., '>').
- Base body text ≥ 16px (14px minimum for small text). Use plain fonts with distinguishable glyphs (e.g., Il1!).
- Line length ≤ 80 characters. Left-align text. Line spacing ≥ 1.5×, paragraph spacing ≥ 1.5× line spacing.
- Headings reflect hierarchy visually and semantically. Proximity to related content, not preceding blocks.
- Buttons used for actions; links for navigation. Buttons have descriptive text. Touch targets ≥ 24×24px with 8–16px spacing.
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
      role: 'user',
      parts: [
        { text: `Page: ${options.pageName}` },
        { text: houseRules },
        { text: 'DETERMINISTIC_ISSUES:' },
        { text: JSON.stringify(deterministicIssues).slice(0, 8000) },
        { text: 'EXTRACTED_CONTEXT (truncated):' },
        { text: JSON.stringify(extracted).slice(0, 8000) }
      ]
    }
  ];
}
