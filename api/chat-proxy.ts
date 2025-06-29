import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'node:fs/promises';
import path from 'node:path';

// Determine which search provider to use based on environment variables.
// Defaults to 'openai_web_search' if SEARCH_PROVIDER is not set.
const searchProvider = process.env.SEARCH_PROVIDER || 'openai_web_search';

/**
 * Main handler for the Vercel serverless function.
 * Routes the request to the appropriate search provider based on the `searchProvider` config.
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { question } = req.body as { question?: string };
  if (!question) {
    res.status(400).json({ error: 'No question provided.' });
    return;
  }

  // Read and sanitise context from local markdown files.
  const resumeData = await getResumeData();

  try {
    // Route to the appropriate streaming function based on the configured provider.
    if (searchProvider === 'openrouter_xai') {
      await streamOpenRouterXai(res, question, resumeData);
    } else {
      await streamOpenaiWebSearch(res, question, resumeData);
    }
  } catch (error) {
    const err = error as Error;
    // Don't send a 500 status code if the stream has already started.
    if (!res.writableEnded) {
      res.status(500).json({ error: err.message || 'Failed to process request.' });
    }
  }
}

/**
 * Fetches and streams a response from OpenAI with web search enabled.
 * Uses the official OpenAI API.
 * @requires OPENAI_API_KEY
 */
async function streamOpenaiWebSearch(res: VercelResponse, question: string, resumeData: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OpenAI API key not configured.' });
    return;
  }

  const apiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      stream: true,
      input: `Be concise, critical, but helpful to answer the question given: ${question}\n\n---\nRésumé for context:\n${resumeData}`,
      tools: [
        {
          type: "web_search_preview",
          search_context_size: "medium"
        }
      ],
    }),
  });

  if (!apiRes.ok || !apiRes.body) {
    const errorBody = await apiRes.text();
    throw new Error(`OpenAI API error: ${apiRes.statusText} - ${errorBody}`);
  }

  // Set up Server-Sent Events headers for the client.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Stream the response body to the client.
  try {
    for await (const chunk of apiRes.body as any) {
      res.write(chunk);
    }
  } catch (err: any) {
    res.write(`data: {"error":"Streaming Error: ${err.message}"}\n\n`);
  } finally {
    res.end();
  }
}

/**
 * Fetches and streams a dual response from OpenRouter (GPT) followed by x.ai (Grok).
 * This is the original implementation.
 * @requires OPENROUTER_API_KEY
 * @requires XAI_API_KEY (optional)
 */
async function streamOpenRouterXai(res: VercelResponse, question: string, resumeData: string) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    res.status(500).json({ error: 'OpenRouter API key not configured.' });
    return;
  }

  const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4.1-mini',
      stream: true,
      messages: [
        {
          role: 'user',
          content: `Be concise, critical, but helpful to answer the question given: ${question}\n\n---\nRésumé for context:\n${resumeData}`
        }
      ]
    }),
  });

  if (!openRouterRes.ok || !openRouterRes.body) {
    throw new Error(`OpenRouter API error: ${openRouterRes.statusText}`);
  }

  // Set up Server-Sent Events headers.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // First, stream the OpenRouter response.
  try {
    for await (const chunk of openRouterRes.body as any) {
      res.write(chunk);
    }
  } catch (err: any) {
    res.write(`data: {"error":"OpenRouter stream error: ${err.message}"}\n\n`);
    res.end();
    return;
  }

  // Then, stream the x.ai live-search as a secondary response.
  res.write('data: {"choices":[{"delta":{"content":"<br><hr><br>"}}]}n\n');
  await streamXaiSearch(res, question);
}

/**
 * Helper to stream a secondary search from x.ai.
 * If the key is missing or the call fails, it gracefully finishes the stream.
 */
async function streamXaiSearch(res: VercelResponse, question: string) {
  const xaiKey = process.env.XAI_API_KEY;
  if (!xaiKey) {
    res.end();
    return;
  }

  const xaiRes = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${xaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-3-latest',
      stream: true,
      messages: [{ role: 'user', content: `Be concise, critical, but helpful to answer the question given: ${question} @jessearmand on X and github` }],
      search_parameters: { mode: 'on', max_search_results: 5, return_citations: true }
    }),
  });

  if (xaiRes.ok && xaiRes.body) {
    try {
      for await (const chunk of xaiRes.body as any) {
        res.write(chunk);
      }
    } catch {
      // Ignore streaming errors from this optional, secondary search.
    }
  }
  res.end();
}

/**
 * Reads and sanitises resume context from local markdown files.
 * @returns The combined and cleaned text content from about.md and summary.md.
 */
async function getResumeData(): Promise<string> {
  try {
    const pagesDir = path.join(process.cwd(), 'content', 'pages');
    const aboutPath = path.join(pagesDir, 'about.md');
    const summaryPath = path.join(pagesDir, 'summary.md');

    const stripFrontMatter = (md: string) =>
      md.replace(/^\+\+\+[\s\S]*?\+\+\+\s*/, '').trim();

    const [aboutRaw = '', summaryRaw = ''] = await Promise.all([
      fs.readFile(aboutPath, 'utf-8').catch(() => ''),
      fs.readFile(summaryPath, 'utf-8').catch(() => ''),
    ]);

    const resumeData = `${stripFrontMatter(aboutRaw)}\n\n${stripFrontMatter(summaryRaw)}`.trim();
    return resumeData || 'Resume data unavailable.';
  } catch {
    return 'Resume data unavailable.';
  }
}