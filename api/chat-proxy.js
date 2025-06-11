export default async function handler(req, res) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on the server. Contact the site administrator.' });
  }

  const { question, resumeData } = req.body; // Expect question and resume data from the client
  if (!question) {
    return res.status(400).json({ error: 'No question provided.' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': req.headers.referer || 'https://jessearmand.com', // Use request referer or fallback
        'X-Title': 'Ruminations', // Use your site title; can be dynamic if needed
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `As a critical and smart thinker, provide answer and consultation to questions based on the following resume: ${resumeData}`
          },
          {
            role: 'user',
            content: question
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to process request.' });
  }
}
