/**
 * Chat client for /chat.
 *
 * Streams SSE from /api/chat-proxy and renders it incrementally. Model output
 * is never assigned as raw HTML — it goes through renderMarkdown(), which
 * escapes first and then applies a fixed set of formatting rules.
 */
import { renderMarkdown, escapeHtml } from './markdown.js';

const ENDPOINT = '/api/chat-proxy';
const SEPARATOR = '<br><hr><br>'; // server signal that a second stream follows

/** A bot turn that re-renders its accumulated markdown as deltas arrive. */
function createTurn(output, label) {
  const el = document.createElement('div');
  el.className = 'chat-turn';
  output.appendChild(el);

  let markdown = '';
  let pending = false;

  const paint = () => {
    pending = false;
    el.innerHTML = `<strong>${escapeHtml(label)}</strong> ${renderMarkdown(markdown)}`;
    output.scrollTop = output.scrollHeight;
  };

  paint();

  return {
    append(text) {
      markdown += text;
      // Coalesce to one paint per frame; a long answer arrives as hundreds of
      // deltas and each one re-renders the whole buffer.
      if (!pending) {
        pending = true;
        requestAnimationFrame(paint);
      }
    },
    finish: paint,
  };
}

function addUserTurn(output, question) {
  const el = document.createElement('div');
  el.className = 'chat-turn';
  el.innerHTML = `<strong>You:</strong> ${escapeHtml(question)}`;
  output.appendChild(el);
}

function addError(output, message) {
  const el = document.createElement('p');
  el.className = 'chat-error';
  el.innerHTML = `<strong>Error:</strong> ${escapeHtml(message)}`;
  output.appendChild(el);
}

function addSources(output, citations) {
  if (!citations.size) return;

  const el = document.createElement('p');
  el.className = 'chat-sources';
  const refs = [...citations.entries()].map(([key, value]) => {
    if (key.startsWith('file:')) {
      return `<span title="Source file">${escapeHtml(value)}</span>`;
    }
    const domain = key.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    return `<a href="${escapeHtml(key)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(value)}">${escapeHtml(domain)}</a>`;
  });
  el.innerHTML = `<em>Sources:</em> ${refs.join(', ')}`;
  output.appendChild(el);
}

/** Pulls the text delta out of either API shape, or '' if the event carries none. */
function extractDelta(parsed) {
  // Responses API (OpenAI)
  if (parsed.type === 'response.output_text.delta') {
    return parsed.delta || '';
  }
  // Chat Completions (OpenRouter / xAI)
  if (parsed.choices && parsed.choices[0].delta) {
    return parsed.choices[0].delta.content || '';
  }
  return '';
}

function collectCitations(parsed, citations) {
  // Responses API: annotations arrive on the completed message.
  if (parsed.type === 'response.completed' && parsed.response?.output) {
    for (const item of parsed.response.output) {
      if (item.type !== 'message' || !item.content) continue;
      for (const part of item.content) {
        if (part.type !== 'output_text' || !part.annotations) continue;
        for (const a of part.annotations) {
          if (a.type === 'url_citation' && a.url) {
            citations.set(a.url, a.title || '');
          } else if (a.type === 'file_citation' && a.filename) {
            citations.set(`file:${a.file_id}`, `📄 ${a.filename}`);
          }
        }
      }
    }
  }

  // Chat Completions (OpenRouter)
  if (parsed.choices && parsed.choices[0].delta?.annotations) {
    for (const a of parsed.choices[0].delta.annotations) {
      if (a.type === 'url_citation' && a.url_citation?.url) {
        citations.set(a.url_citation.url, a.url_citation.title || '');
      }
    }
  }

  // Chat Completions (xAI)
  if (parsed.citations) {
    for (const url of parsed.citations) citations.set(url, '');
  }
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const button = document.getElementById('chat-send');
  const output = document.getElementById('chat-output');

  const question = input.value.trim();
  if (!question) return;

  addUserTurn(output, question);
  input.value = '';
  input.disabled = true;
  button.disabled = true;

  const citations = new Map();
  let turn = createTurn(output, 'Bot:');

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let lineEnd;
      while ((lineEnd = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (!line.startsWith('data: ')) continue; // skip `event:` lines and blanks
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        // Reasoning models emit reasoning/summary events alongside the answer.
        // We only render the final answer, so drop them outright.
        if (typeof parsed.type === 'string' && parsed.type.startsWith('response.reasoning')) continue;

        const delta = extractDelta(parsed);
        if (delta === SEPARATOR) {
          // Server is handing over to the secondary live-search stream.
          turn.finish();
          const hr = document.createElement('hr');
          hr.className = 'chat-separator';
          output.appendChild(hr);
          turn = createTurn(output, 'Live Search:');
          continue;
        }
        if (delta) turn.append(delta);

        collectCitations(parsed, citations);
      }
    }
  } catch (error) {
    addError(output, error.message);
  } finally {
    turn.finish();
    addSources(output, citations);
    input.disabled = false;
    button.disabled = false;
    input.focus();
    output.scrollTop = output.scrollHeight;
  }
}

document.getElementById('chat-send').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    sendMessage();
  }
});
