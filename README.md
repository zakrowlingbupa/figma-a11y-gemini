# A11y Annotations (Gemini) — Figma Plugin

A Figma plugin that performs deterministic WCAG checks and uses Google's **Gemini** to understand design context and generate actionable **accessibility annotations** on the canvas.

## Features
- Deterministic checks for contrast, touch target size, link affordance, and heading hierarchy hints.
- Context extraction (roles, text, sizes, colors) to give Gemini enough signal without sending full designs.
- Model-generated annotations mapped to WCAG 2.x with concrete fixes.
- One-click on-canvas callouts and clearing.

## Project Structure
```
figma-a11y-gemini/
  ├── package.json
  ├── tsconfig.json
  ├── README.md
  ├── scripts/
  │   └── build.mjs
  ├── server/
  │   └── proxy.ts          # Vercel serverless function for Gemini API
  └── figma-plugin/
      ├── manifest.json
      └── src/
          ├── main.ts
          ├── ui.html
          ├── ui.ts
          ├── extract.ts
          ├── rules.ts
          ├── contrast.ts
          ├── prompt.ts
          └── gemini.ts
```

## Prerequisites
- Node.js 18+
- A Google Generative Language API key (Gemini). Set as `GOOGLE_API_KEY` in your serverless environment.

## Quick Start

### 1) Install dependencies
```bash
npm install
```

### 2) Build the plugin
```bash
npm run build
```
This creates `figma-plugin/dist/main.js` and `figma-plugin/dist/ui.html`/`ui.js`.

### 3) Import the plugin into Figma
- In Figma: **Plugins → Development → Import plugin from manifest…**
- Choose: `figma-a11y-gemini/figma-plugin/manifest.json`

### 4) Deploy the Gemini proxy (Vercel example)
- Copy `server/proxy.ts` into a Vercel project (or deploy this folder with Vercel CLI).
- Set environment variable: `GOOGLE_API_KEY`
- Deploy. You’ll get a URL like: `https://your-app.vercel.app/api/gemini`

> **Note:** The proxy keeps your Gemini API key **off** users’ machines.

### 5) Run it
- Open your design in Figma.
- Run the plugin → paste the proxy URL → **Scan**.
- Review **Deterministic issues** and **Model annotations**.
- Click **Apply annotations** to add callouts on canvas.
- **Clear annotations** to remove them.

## Configuration
- `server/proxy.ts`: change the default model (`gemini-1.5-pro-latest`) if desired.
- `src/prompt.ts`: adjust house rules and WCAG references to match your design system.
- `src/rules.ts`: add more deterministic checks as needed.

## Security & Privacy
- **Never** embed your API key in the plugin. Use the proxy.
- The plugin sends compact JSON context, not full design files.

## License
MIT
