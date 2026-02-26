// Vercel serverless function: /api/gemini
// Requires env: GOOGLE_API_KEY

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, model = 'gemini-1.5-pro-latest', temperature = 0.2 } = req.body || {};
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing GOOGLE_API_KEY' });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: messages,
      generationConfig: {
        temperature,
        candidateCount: 1,
        maxOutputTokens: 2048
      }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await r.json();

    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    return res.status(200).json({ text, raw: json });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unknown error' });
  }
}
