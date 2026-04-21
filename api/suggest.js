export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  const { angle, assetCode, maturity, days, metrics } = req.body || {};
  if (!assetCode) return res.status(400).json({ error: 'Missing promo data' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // Build a metrics summary string
  const metricLines = (metrics || [])
    .map(m => `  ${m.label}: ${m.value} (benchmark ${m.benchmark}) — ${m.status}`)
    .join('\n');

  const prompt = `You are a mobile game UA (user acquisition) analyst. A promo has been running and you must suggest a clear next action in 1–2 short sentences. Be direct and specific — no filler.

Promo: ${angle} | Asset: ${assetCode} | Maturity: ${maturity} | Days running: ${days}

Key metrics:
${metricLines || '  (no metric data available)'}

Respond with only the suggested action. No preamble.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(502).json({ error: `Anthropic error: ${err}` });
  }

  const data = await response.json();
  const suggestion = data.content?.[0]?.text?.trim() || '';
  res.status(200).json({ suggestion });
}
