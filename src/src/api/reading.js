// Vercel Serverless Function
// 部署后可通过 POST /api/reading 调用
// API key 只存在于服务端环境变量里，浏览器永远看不到

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "只支持 POST 请求" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "服务端未配置 ANTHROPIC_API_KEY，请在 Vercel 项目环境变量中添加" });
    return;
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "缺少 prompt 字段" });
    return;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: data.error?.message || "Anthropic API 请求失败" });
      return;
    }

    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message || "服务端请求异常" });
  }
}
