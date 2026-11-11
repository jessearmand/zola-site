/**
 * Conversation history kept by the chat client.
 *
 * The site has no database, so the browser holds the conversation and sends
 * it with every question. The server validates it (`lib/chat-history.ts`)
 * and accepts only the item shapes built here:
 *
 *   { role: "user" | "assistant", text }       a turn
 *   { type: "compaction", id, encrypted_content }  OpenAI's stand-in for compacted turns
 *   { type: "summary", text }                  plain-text stand-in for compacted turns
 *
 * The last two only ever come from the server, in a `chat.history.replaced`
 * event, when the conversation has grown enough to be compacted.
 *
 * These functions return new arrays and never change the one passed in.
 */

/**
 * @typedef {{ role: "user" | "assistant", text: string }
 *   | { type: "compaction", id: string, encrypted_content: string }
 *   | { type: "summary", text: string }} HistoryItem
 */

/** @returns {HistoryItem[]} */
export function createHistory() {
  return [];
}

/**
 * The compacted history carried by a `chat.history.replaced` event, or null
 * if the event is anything else.
 * @param {unknown} parsed Parsed SSE `data:` payload.
 * @returns {HistoryItem[] | null}
 */
export function replacementHistory(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.type !== "chat.history.replaced" || !Array.isArray(parsed.history)) return null;
  return parsed.history;
}

/**
 * True for the event that marks a guardrail refusal. A refused turn is shown
 * but not kept: it should not become context for the next question.
 * @param {unknown} parsed
 */
export function isRefusal(parsed) {
  return !!parsed && typeof parsed === "object" && parsed.type === "chat.refusal";
}

/**
 * History after a completed turn.
 * @param {HistoryItem[]} history
 * @param {string} question
 * @param {string} answer
 * @returns {HistoryItem[]}
 */
export function recordTurn(history, question, answer) {
  if (!question || !answer) return history;
  return [...history, { role: "user", text: question }, { role: "assistant", text: answer }];
}
