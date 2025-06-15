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

        // enable real-time web search grounding
        plugins: [
          { id: 'web', max_results: 5 }    // limit to five results
        ],
        web_search_options: {
          search_context_size: 'low'       // minimal context to control cost
        },

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

    try {
      // If running under Node (Vercel) we usually get a classic Readable stream
      if (openRouterRes.body && typeof (openRouterRes.body as any).pipe === 'function') {
        (openRouterRes.body as any).pipe(res);

        (openRouterRes.body as any).on('error', (err: any) => {
          res.write(`data: {"error":"${err.message}"}\n\n`);
          res.end();
        });

        // Ensure the client connection closes when the upstream stream ends
        (openRouterRes.body as any).on('end', () => res.end());

      } else {
        // Fallback for Web ReadableStream (rare, but covers all runtimes)
        const reader = openRouterRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value));
        }
        res.end();
      }
    } catch (streamErr) {
      const err = streamErr as Error;
      res.write(`data: {"error":"${err.message}"}\n\n`);
      res.end();
    }
    return;
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Failed to process request.' });
  }
}
