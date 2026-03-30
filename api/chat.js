// Vercel Serverless Function — /api/chat
// Proxies requests to Anthropic API so your key stays server-side.

export default async function handler(req, res) {
  // CORS headers for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, systemPrompt } = req.body;

  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in environment" });

  try {
    const messages = [{ role: "user", content: prompt }];

    const body = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages,
    };

    if (systemPrompt) body.system = systemPrompt;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", response.status, err);
      return res.status(response.status).json({ error: "Anthropic API error", details: err });
    }

    const data = await response.json();
    const text = data.content?.map((c) => c.text || "").join("") || "";

    return res.status(200).json({ text });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
