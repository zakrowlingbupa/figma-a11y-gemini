export async function askGemini(messages: any[], opts?: { proxyUrl?: string; model?: string }) {
  const proxyUrl = opts?.proxyUrl || 'https://your-deployment.vercel.app/api/gemini';
  const resp = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model: opts?.model || 'gemini-1.5-pro-latest' })
  });
  if (!resp.ok) throw new Error(`Proxy error: ${resp.status}`);
  const { text } = await resp.json();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}$/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Model did not return valid JSON');
  }
}
