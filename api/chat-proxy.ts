import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'node:fs/promises';
import path from 'node:path';
import { TextDecoder } from 'node:util';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'API key not configured on the server. Contact the site administrator.' });
    return;
  }

  const { question } = (req.body as { question?: string });
  if (!question) {
    res.status(400).json({ error: 'No question provided.' });
    return;
  }

  // Read and sanitise context from *about.md* + *summary.md*
  let resumeData = '';
  try {
    const pagesDir = path.join(process.cwd(), 'content', 'pages');
    const aboutPath   = path.join(pagesDir, 'about.md');
    const summaryPath = path.join(pagesDir, 'summary.md');

    const stripFrontMatter = (md: string) =>
      md.replace(/^\+\+\+[\s\S]*?\+\+\+\s*/, '').trim();

    const [aboutRaw = '', summaryRaw = ''] = await Promise.all([
      fs.readFile(aboutPath,   'utf-8').catch(() => ''),
      fs.readFile(summaryPath, 'utf-8').catch(() => ''),
    ]);

    resumeData = `${stripFrontMatter(aboutRaw)}\n\n${stripFrontMatter(summaryRaw)}`.trim();
    if (!resumeData) resumeData = 'Resume data unavailable.';
  } catch {
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
            role: 'user',
            // Combine visitor question + résumé for grounding
            content: `${question}\n\n---\nRésumé for context:\n${resumeData}`
          }
        ]
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

    try {
      /* ---- stream OpenRouter tokens ---- */
      try {
        for await (const chunk of openRouterRes.body as any) {
          res.write(chunk);
        }
      } catch (err: any) {
        res.write(`data: {"error":"${err.message}"}\n\n`);
        res.end();
        return;
      }

      /* ---- after OpenRouter finishes, add x.ai live-search ---- */
      res.write('data: {"choices":[{"delta":{"content":"<br><hr><br>"}}]}\n\n');
      await streamXaiSearch();
    } catch (streamErr) {
      const err = streamErr as Error;
      res.write(`data: {"error":"${err.message}"}\n\n`);
      res.end();
    }
    return;

  /** Stream an x.ai live-search request after the OpenRouter stream.
      If the key is missing or the call fails, simply finish the SSE. */
  async function streamXaiSearch() {
    const xKey = process.env.XAI_API_KEY;
    if (!xKey) { res.end(); return; }

    const xaiRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${xKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-latest',
        stream: true,
        messages: [{ role: 'user', content: question }],
        search_parameters: { mode: 'on', max_search_results: 5, return_citations: true }
      }),
    });

    if (!xaiRes.ok || !xaiRes.body) { res.end(); return; }

    try {
      for await (const chunk of xaiRes.body as any) {
        res.write(chunk);
      }
    } catch {/* ignore streaming errors from optional search */}

    res.end();
  }
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Failed to process request.' });
  }
}
