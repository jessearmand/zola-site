/**
 * Inline citation markers in model output.
 *
 * With file_search (and sometimes web_search), OpenAI models write citation
 * markers straight into the answer text, for example
 *
 *   U+E200 "filecite" U+E202 "turn0file0" U+E202 "turn0file1" U+E201
 *
 * The delimiters are Private Use Area characters, so a browser draws them as
 * boxes. The real citations also arrive as annotations on the completed
 * message, and chat.js lists those under "Sources", so the inline markers
 * carry nothing the reader needs and are removed.
 */

const OPEN = "";
const CLOSE = "";
const SEPARATOR = "";

/** A complete marker, with the spaces before it, so no gap is left behind. */
const COMPLETE_MARKER = new RegExp(`[ \\t]*${OPEN}[^${OPEN}${CLOSE}]*${CLOSE}`, "g");
/** A marker that has opened but not closed yet: the tail of a streaming buffer. */
const OPEN_TAIL = new RegExp(`[ \\t]*${OPEN}[^${CLOSE}]*$`);
/** Any delimiter left over from a malformed marker. */
const STRAY_DELIMITER = new RegExp(`[${OPEN}${CLOSE}${SEPARATOR}]`, "g");

/**
 * Removes inline citation markers from model text.
 *
 * A marker can be split across stream deltas, so call this on the whole
 * accumulated text, not on each delta. An unclosed marker at the end is
 * dropped too: while streaming it is a marker still in flight, and at the end
 * of a reply it is a marker the model never finished.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripCitationMarkers(text) {
  if (!text.includes(OPEN) && !text.includes(CLOSE) && !text.includes(SEPARATOR)) return text;
  return text.replace(COMPLETE_MARKER, "").replace(OPEN_TAIL, "").replace(STRAY_DELIMITER, "");
}
