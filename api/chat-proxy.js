import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on the server. Contact the site administrator.' });
  }

  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'No question provided.' });
  }

  // Read and sanitise resume data from markdown
  let resumeData = '';
  try {
    const aboutPath = path.join(process.cwd(), 'content', 'pages', 'about.md');
    const raw = await fs.readFile(aboutPath, 'utf-8');
    // strip +++ front-matter if present
    resumeData = raw.replace(/^\+\+\+[\s\S]*?\+\+\+\s*/, '').trim();
  } catch (_) {
    resumeData = 'Resume data unavailable.';
  }

  try {
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': req.headers.referer || 'https://jessearmand.com',
        'X-Title': 'Ruminations',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        stream: true,
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
    if (!openRouterRes.ok || !openRouterRes.body) {
      throw new Error(`OpenRouter API error: ${openRouterRes.statusText}`);
    }

    // Set up Server-Sent Events headers for the client
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const reader = openRouterRes.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value));
      }
    } catch (streamErr) {
      res.write(`data: {"error":"${streamErr.message}"}\n\n`);
    } finally {
      res.end();
    }
    return;
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to process request.' });
  }
}
