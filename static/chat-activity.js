/**
 * Progress phase for one assistant turn, derived from the Responses API stream.
 *
 * The chat proxy forwards that stream unchanged (`api/chat-proxy.ts` writes
 * each upstream chunk straight through), so the browser sees the same SSE
 * `data:` payloads OpenAI emits. Each payload carries a `type`. Hosted
 * retrieval shows up as:
 *
 *   response.web_search_call.in_progress
 *   response.web_search_call.searching
 *   response.web_search_call.completed
 *   response.file_search_call.in_progress
 *   response.file_search_call.searching
 *   response.file_search_call.completed
 *
 * and as `response.output_item.added` / `response.output_item.done` whose
 * `item.type` is `web_search_call` or `file_search_call`. A call stays active
 * through `in_progress` and `searching`, and ends on `completed`,
 * `incomplete`, or `failed` (or when its output item is done).
 *
 * The guardrail runs before any of these events, so a turn starts at
 * "thinking" and stays there until a search call or answer text arrives.
 * When every search call has finished, the phase returns to "thinking" —
 * including when a later `response.reasoning*` event or reasoning output item
 * shows the model is composing again. This deployment does not request
 * reasoning summaries, so those events are often absent; search completion
 * itself is what flips the label back. The first visible answer delta, or a
 * terminal error, moves the phase to "done" and the indicator comes down.
 */

/** How long each "Thinking." / "Thinking.." / "Thinking..." frame stays up. */
export const DOT_STEP_MS = 1000;

const SEARCH_ITEM_TYPES = new Set(["web_search_call", "file_search_call"]);
const ACTIVE_SEARCH_PHASES = new Set(["in_progress", "searching"]);
const TERMINAL_SEARCH_PHASES = new Set(["completed", "incomplete", "failed"]);
const TERMINAL_RESPONSE_TYPES = new Set(["error", "response.failed", "response.incomplete"]);

/**
 * @typedef {"thinking" | "reading" | "done"} ActivityPhase
 * @typedef {{ phase: ActivityPhase, calls: string[] }} ActivityState
 */

/** @returns {ActivityState} */
export function createActivity() {
  return { phase: "thinking", calls: [] };
}

/** Stable accessible name: "Thinking" or "Reading", never the cycling dots. */
export function progressLabel(phase) {
  return phase === "reading" ? "Reading" : "Thinking";
}

/** 1, 2, or 3 — the dot count for this frame of the cycle. */
export function dotCount(step) {
  const n = Number.isFinite(step) ? Math.floor(step) : 0;
  return (((n % 3) + 3) % 3) + 1;
}

/** Visible frame, e.g. "Thinking.", "Reading..", "Thinking...". */
export function progressVisual(phase, step) {
  return progressLabel(phase) + ".".repeat(dotCount(step));
}

/**
 * Pulls the text delta out of either API shape, or '' if the event carries none.
 * @param {unknown} parsed
 * @returns {string}
 */
export function extractDelta(parsed) {
  if (!parsed || typeof parsed !== "object") return "";
  // Responses API (OpenAI, and the xAI live-search follow-up)
  if (parsed.type === "response.output_text.delta") {
    return parsed.delta || "";
  }
  // Chat Completions (OpenRouter / xAI)
  if (parsed.choices && parsed.choices[0].delta) {
    return parsed.choices[0].delta.content || "";
  }
  return "";
}

/**
 * Identity for one hosted tool call. `output_index` is on every search event
 * and on the matching output-item events, so the two shapes collapse to one
 * call. `item_id` covers a payload that omitted the index.
 * @param {object} event
 * @param {object | undefined} item
 * @returns {string | null}
 */
function callKey(event, item) {
  if (typeof event.output_index === "number") return `output:${event.output_index}`;
  if (item && typeof item.id === "string" && item.id) return item.id;
  if (typeof event.item_id === "string" && event.item_id) return event.item_id;
  return null;
}

/**
 * @param {string} type
 * @returns {string | null} The phase suffix, e.g. "searching", or null.
 */
function searchEventPhase(type) {
  const match = /^response\.(?:web_search_call|file_search_call)\.(.+)$/.exec(type);
  return match ? match[1] : null;
}

/**
 * @param {ActivityState} state
 * @param {string[]} calls
 * @returns {ActivityState}
 */
function withCalls(state, calls) {
  const phase = calls.length > 0 ? "reading" : "thinking";
  if (phase === state.phase && sameCalls(state.calls, calls)) return state;
  return { phase, calls };
}

/**
 * @param {string[]} a
 * @param {string[]} b
 */
function sameCalls(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/** @returns {ActivityState} */
function done() {
  return { phase: "done", calls: [] };
}

/**
 * @param {ActivityState} state
 * @param {unknown} event Parsed SSE `data:` payload.
 * @returns {ActivityState} The same object when the phase does not change.
 */
export function reduceActivity(state, event) {
  if (!state || state.phase === "done") return state;
  if (!event || typeof event !== "object") return state;

  if (extractDelta(event)) return done();
  if (event.error || TERMINAL_RESPONSE_TYPES.has(event.type)) return done();

  const type = typeof event.type === "string" ? event.type : "";
  const searchPhase = searchEventPhase(type);
  if (searchPhase) {
    const key = callKey(event, undefined);
    if (!key) return state;
    if (ACTIVE_SEARCH_PHASES.has(searchPhase)) {
      return withCalls(state, state.calls.includes(key) ? state.calls : [...state.calls, key]);
    }
    if (TERMINAL_SEARCH_PHASES.has(searchPhase)) {
      return withCalls(
        state,
        state.calls.filter((id) => id !== key),
      );
    }
    return state;
  }

  if (type === "response.output_item.added" || type === "response.output_item.done") {
    const item = event.item;
    if (!item || !SEARCH_ITEM_TYPES.has(item.type)) return state;
    const key = callKey(event, item);
    if (!key) return state;
    const terminal =
      type === "response.output_item.done" || TERMINAL_SEARCH_PHASES.has(item.status);
    if (terminal) {
      return withCalls(
        state,
        state.calls.filter((id) => id !== key),
      );
    }
    return withCalls(state, state.calls.includes(key) ? state.calls : [...state.calls, key]);
  }

  // Reasoning events (`response.reasoning*`, or a reasoning output item)
  // carry no search call, so they leave the phase alone: Reading while a
  // call is still open, Thinking once `withCalls` has already cleared them.
  return state;
}
