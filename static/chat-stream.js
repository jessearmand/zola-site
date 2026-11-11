/**
 * Reading the chat proxy's SSE stream: splitting it into events, and telling
 * a finished reply from a failed or truncated one.
 *
 * A reply can fail in ways that produce no answer text at all: the provider
 * reports an error mid-stream, the response ends as failed or incomplete, or
 * the connection drops (a function that hits its time limit just stops
 * sending). Each of these must reach the visitor as a message. Without that,
 * the progress label disappears and the question looks ignored.
 */

export const INTERRUPTED_MESSAGE = "The reply was cut off before it finished. Please try again.";
export const EMPTY_MESSAGE = "No answer came back. Please try again.";

const INCOMPLETE_REASONS = {
  max_output_tokens: "The reply hit its length limit and was cut short.",
  content_filter: "The reply was stopped by a content filter.",
};

/**
 * Splits buffered SSE text into the `data:` payloads of its complete lines.
 * `event:` lines, comments and blank lines are skipped.
 * @param {string} buffer
 * @returns {{ payloads: string[], rest: string }} `rest` is the trailing
 *   partial line, to be prepended to the next chunk.
 */
export function splitSseBuffer(buffer) {
  const payloads = [];
  let rest = buffer;
  let lineEnd;
  while ((lineEnd = rest.indexOf("\n")) !== -1) {
    const line = rest.slice(0, lineEnd).trim();
    rest = rest.slice(lineEnd + 1);
    if (line.startsWith("data:")) payloads.push(line.slice(5).trim());
  }
  return { payloads, rest };
}

/** @param {unknown} error */
function errorText(error) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof error.message === "string") {
    return error.message;
  }
  return "";
}

/**
 * The message to show for an event that reports a failure, or '' if the
 * event is not a failure.
 *
 * Covers the proxy's own `{ error }` events, the Responses API's `error`,
 * `response.failed` and `response.incomplete` events, and a Chat Completions
 * chunk carrying an `error`.
 * @param {unknown} parsed Parsed SSE `data:` payload.
 * @returns {string}
 */
export function streamErrorMessage(parsed) {
  if (!parsed || typeof parsed !== "object") return "";

  if (parsed.error) {
    return errorText(parsed.error) || "The reply failed. Please try again.";
  }
  if (parsed.type === "error") {
    return errorText(parsed) || "The reply failed. Please try again.";
  }
  if (parsed.type === "response.failed") {
    return errorText(parsed.response?.error) || "The reply failed. Please try again.";
  }
  if (parsed.type === "response.incomplete") {
    const reason = parsed.response?.incomplete_details?.reason;
    return INCOMPLETE_REASONS[reason] || "The reply ended before it was complete.";
  }
  return "";
}

/**
 * True when a payload marks the normal end of a reply: `response.completed`
 * on the Responses API, `[DONE]` or a `finish_reason` on Chat Completions.
 * A stream that ends without one was cut off.
 * @param {string} data Raw `data:` payload.
 * @param {unknown} parsed The payload parsed as JSON, or null.
 */
export function isCompletion(data, parsed) {
  if (data === "[DONE]") return true;
  if (!parsed || typeof parsed !== "object") return false;
  if (parsed.type === "response.completed") return true;
  return Array.isArray(parsed.choices) && parsed.choices.some((choice) => !!choice?.finish_reason);
}

/**
 * Message for a response that failed before any stream started.
 * @param {number} status HTTP status.
 * @param {string} bodyText Response body, which the proxy sends as `{ error }`.
 */
export function httpErrorMessage(status, bodyText) {
  try {
    const message = errorText(JSON.parse(bodyText)?.error);
    if (message) return message;
  } catch {
    // Not JSON: a platform error page. Fall through to the status.
  }
  if (status === 504) return "The request timed out. Please try again.";
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  return `Request failed with status ${status}.`;
}

/**
 * What to tell the visitor when the stream has ended, or '' if the reply is
 * complete.
 * @param {{ completed: boolean, hasText: boolean, failed: boolean }} outcome
 *   `failed` is true when an error event was already shown.
 */
export function endOfStreamMessage({ completed, hasText, failed }) {
  if (failed) return "";
  if (!completed) return INTERRUPTED_MESSAGE;
  if (!hasText) return EMPTY_MESSAGE;
  return "";
}
