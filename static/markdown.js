/**
 * Minimal, escape-first markdown renderer for streamed model output.
 *
 * The model's text is untrusted: it can quote a blog post that itself contains
 * HTML, and web search can pull arbitrary text into the answer. So every input
 * is HTML-escaped *first*, and formatting is then applied to the escaped text.
 * No path through this module can emit markup that came from the input.
 *
 * Deliberately small — it covers what the chat answers actually use (paragraphs,
 * bold, italic, code, lists, blockquotes, headings, links) rather than the whole
 * CommonMark grammar.
 */

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Only http(s) links become anchors; anything else renders as plain text. */
function isSafeUrl(url) {
  return /^https?:\/\//i.test(url);
}

/**
 * Applies inline formatting to an already-escaped line.
 * Inline code is extracted first so its contents are never re-interpreted.
 */
function renderInline(escaped) {
  const codeSpans = [];
  let text = escaped.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(code);
    // Sentinel cannot occur in the escaped text, so the placeholder can
    // never collide with a literal number the model wrote.
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  // Links: [label](url). The url arrives escaped, so &amp; must be read back
  // when testing the scheme.
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
    const href = url.replace(/&amp;/g, "&");
    return isSafeUrl(href)
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : match;
  });

  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  text = text.replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>");

  // oxlint(no-control-regex): the NUL sentinel is the point — it is the one
  // character that cannot appear in the escaped text, so the placeholder can
  // never collide with a literal number the model wrote.
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codeSpans[Number(i)]}</code>`);
}

/** Renders one blank-line-delimited block: list, heading, quote, or paragraph. */
function renderBlock(block) {
  const lines = block.split("\n");

  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    const items = lines.map((line) => `<li>${renderInline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
    return `<ul>${items.join("")}</ul>`;
  }

  if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
    const items = lines.map(
      (line) => `<li>${renderInline(line.replace(/^\s*\d+[.)]\s+/, ""))}</li>`,
    );
    return `<ol>${items.join("")}</ol>`;
  }

  if (lines.every((line) => /^\s*&gt;\s?/.test(line))) {
    const quoted = lines.map((line) => line.replace(/^\s*&gt;\s?/, "")).join("<br/>");
    return `<blockquote>${renderInline(quoted)}</blockquote>`;
  }

  const heading = block.match(/^(#{1,6})\s+(.*)$/);
  if (heading) {
    const level = Math.min(heading[1].length + 2, 6); // h1 in a chat bubble is too loud
    return `<h${level}>${renderInline(heading[2])}</h${level}>`;
  }

  return `<p>${renderInline(lines.join("<br/>"))}</p>`;
}

/**
 * Renders markdown to a safe HTML string.
 *
 * Tolerates partial input: while a response streams, an unterminated `**` or
 * code fence simply renders as literal text until its closing delimiter
 * arrives, and the next render corrects it.
 */
export function renderMarkdown(markdown) {
  const escaped = escapeHtml(markdown);

  // Split on fences first so blank lines inside a code block don't split it.
  return escaped
    .split(/```/)
    .map((segment, index) => {
      // Odd segments sit between a pair of fences.
      if (index % 2 === 1) {
        return `<pre><code>${segment.replace(/^[^\n]*\n/, "")}</code></pre>`;
      }
      return segment
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map(renderBlock)
        .join("");
    })
    .join("");
}
