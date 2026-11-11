/**
 * Conversation history for the chat widget.
 *
 * The site has no database, so the browser keeps the history and sends it back
 * with every question. That makes it untrusted input: a caller can fabricate
 * any of it. This module is the trust boundary. It accepts only a small fixed
 * set of item shapes, bounds their size, and builds each provider's message
 * list from them, so nothing a caller sends is forwarded to a model as-is and
 * nothing a caller sends is ever given the system role.
 *
 * Kept free of local `.js` imports so the Node strip-types test runner can
 * load it directly (same pattern as `chat-provider.ts`).
 */

/** A turn the visitor or the assistant wrote. */
export type TextItem = { role: "user" | "assistant"; text: string };

/**
 * OpenAI's opaque stand-in for the turns it compacted. Only OpenAI models can
 * read it. https://developers.openai.com/api/docs/guides/compaction
 */
export type CompactionItem = { type: "compaction"; id: string; encrypted_content: string };

/** Plain-text stand-in for compacted turns, for models that cannot read a compaction item. */
export type SummaryItem = { type: "summary"; text: string };

export type HistoryItem = TextItem | CompactionItem | SummaryItem;

export type HistoryLimits = {
  /** Longest visitor turn, in characters. Matches the limit on a new question. */
  maxUserChars: number;
  /** Refuse the request when the history's text is estimated above this. */
  maxHistoryTokens: number;
};

export const MAX_HISTORY_ITEMS = 1000;
/** One answer with citations is a few thousand characters; this is generous. */
export const MAX_ASSISTANT_CHARS = 100_000;
export const MAX_SUMMARY_CHARS = 40_000;
export const MAX_COMPACTION_ID_CHARS = 200;
export const MAX_ENCRYPTED_CHARS = 400_000;

export type ParsedHistory =
  | { ok: true; items: HistoryItem[] }
  | { ok: false; status: 400 | 413; error: string };

/**
 * Rough token count for text: about four characters per token for English
 * prose. It is an estimate, not a tokenizer, so thresholds that use it keep a
 * margin (see `contextBudget`).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimated tokens the history's text adds to a request.
 *
 * A compaction item counts as nothing: its encrypted payload is not what the
 * model is charged for, and counting it would make a freshly compacted history
 * look like it needs compacting again.
 */
export function estimateHistoryTokens(items: readonly HistoryItem[]): number {
  let tokens = 0;
  for (const item of items) {
    if ("text" in item) tokens += estimateTokens(item.text);
  }
  return tokens;
}

/** True when the history plus the new question has reached the compaction threshold. */
export function shouldCompact(
  items: readonly HistoryItem[],
  question: string,
  compactAtTokens: number,
): boolean {
  if (items.length === 0) return false;
  return estimateHistoryTokens(items) + estimateTokens(question) >= compactAtTokens;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxChars: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxChars;
}

/** Validates one item, returning a fresh object with only the known fields. */
function parseItem(raw: unknown, limits: HistoryLimits): HistoryItem | null {
  if (!isRecord(raw)) return null;

  if (raw.type === "compaction") {
    return isBoundedString(raw.id, MAX_COMPACTION_ID_CHARS) &&
      isBoundedString(raw.encrypted_content, MAX_ENCRYPTED_CHARS)
      ? { type: "compaction", id: raw.id, encrypted_content: raw.encrypted_content }
      : null;
  }

  if (raw.type === "summary") {
    return isBoundedString(raw.text, MAX_SUMMARY_CHARS)
      ? { type: "summary", text: raw.text }
      : null;
  }

  if (raw.type !== undefined) return null;

  if (raw.role === "user") {
    return isBoundedString(raw.text, limits.maxUserChars) ? { role: "user", text: raw.text } : null;
  }
  if (raw.role === "assistant") {
    return isBoundedString(raw.text, MAX_ASSISTANT_CHARS)
      ? { role: "assistant", text: raw.text }
      : null;
  }
  return null;
}

/**
 * Validates the history a client sent. A missing history is an empty one.
 *
 * Malformed input is rejected rather than repaired: a client that sends an
 * item this module does not recognise is either out of date or probing, and
 * silently dropping the item would answer from a different conversation than
 * the one the visitor sees.
 */
export function parseHistory(raw: unknown, limits: HistoryLimits): ParsedHistory {
  if (raw === undefined || raw === null) return { ok: true, items: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, status: 400, error: "Conversation history must be a list." };
  }
  if (raw.length > MAX_HISTORY_ITEMS) {
    return { ok: false, status: 413, error: "This conversation is too long. Start a new chat." };
  }

  const items: HistoryItem[] = [];
  for (const entry of raw) {
    const item = parseItem(entry, limits);
    if (!item) {
      return { ok: false, status: 400, error: "Conversation history is not in a valid format." };
    }
    items.push(item);
  }

  if (estimateHistoryTokens(items) > limits.maxHistoryTokens) {
    return { ok: false, status: 413, error: "This conversation is too long. Start a new chat." };
  }
  return { ok: true, items };
}

const SUMMARY_PREFIX = "[Summary of the earlier conversation]\n";

type ResponsesInputItem =
  | { role: "user" | "assistant"; content: string }
  | { type: "compaction"; id: string; encrypted_content: string };

/**
 * Builds the Responses API `input` list: the history, then the new question.
 *
 * A summary goes in as a user-role note. It came from the client like the rest
 * of the history, so it gets no more authority than a visitor turn.
 */
export function toResponsesInput(
  items: readonly HistoryItem[],
  question?: string,
): ResponsesInputItem[] {
  const input: ResponsesInputItem[] = items.map((item) => {
    if ("role" in item) return { role: item.role, content: item.text };
    if (item.type === "compaction") {
      return { type: "compaction", id: item.id, encrypted_content: item.encrypted_content };
    }
    return { role: "user", content: SUMMARY_PREFIX + item.text };
  });
  if (question !== undefined) input.push({ role: "user", content: question });
  return input;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Builds Chat Completions messages (without the system message): the history,
 * then the new question. Compaction items are dropped, because only OpenAI
 * models can read them.
 */
export function toChatMessages(items: readonly HistoryItem[], question?: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const item of items) {
    if ("role" in item) messages.push({ role: item.role, content: item.text });
    else if (item.type === "summary") {
      messages.push({ role: "user", content: SUMMARY_PREFIX + item.text });
    }
  }
  if (question !== undefined) messages.push({ role: "user", content: question });
  return messages;
}

/** Joins the text parts of a Responses API message item. */
function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .join("");
}

/**
 * Converts the output of `/responses/compact` into history items.
 *
 * The endpoint returns the next context window: the turns it kept verbatim,
 * then a compaction item for everything else. The order is preserved. Returns
 * null when there is no compaction item, which means the call did not do what
 * it was asked and the caller should keep the history it had.
 */
export function fromCompactOutput(output: unknown): HistoryItem[] | null {
  if (!Array.isArray(output)) return null;

  const items: HistoryItem[] = [];
  let compacted = false;
  for (const entry of output) {
    if (!isRecord(entry)) continue;
    if (entry.type === "compaction") {
      if (typeof entry.id !== "string" || typeof entry.encrypted_content !== "string") return null;
      items.push({ type: "compaction", id: entry.id, encrypted_content: entry.encrypted_content });
      compacted = true;
    } else if (entry.type === "message" && (entry.role === "user" || entry.role === "assistant")) {
      const text = messageText(entry.content);
      if (text) items.push({ role: entry.role, text });
    }
  }
  return compacted ? items : null;
}

/**
 * Converts a Chat Completions summarising response into history items.
 *
 * The summary replaces the history it describes, and the browser then discards
 * the original turns, so only a whole summary is accepted. Returns null when
 * the model did not finish cleanly (`finish_reason` other than `stop`, such as
 * `length` or `content_filter`), when the text is empty, or when it is longer
 * than `parseHistory` would accept back. Clipping it instead would silently
 * drop whatever the cut removed. On null the caller keeps the history it had.
 */
export function fromSummaryCompletion(completion: unknown): HistoryItem[] | null {
  if (!isRecord(completion) || !Array.isArray(completion.choices)) return null;
  const choice: unknown = completion.choices[0];
  if (!isRecord(choice) || choice.finish_reason !== "stop") return null;
  if (!isRecord(choice.message) || typeof choice.message.content !== "string") return null;

  const text = choice.message.content.trim();
  return isBoundedString(text, MAX_SUMMARY_CHARS) ? [{ type: "summary", text }] : null;
}

export type ContextTurn = { role: "user" | "assistant" | "summary"; text: string };

function clip(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

/**
 * The last few readable turns, clipped, for the guardrails. They need enough
 * of the conversation to tell what a follow-up like "tell me more" refers to,
 * and no more: these calls sit in the visitor's critical path.
 */
export function recentTurns(
  items: readonly HistoryItem[],
  maxTurns: number,
  maxCharsPerTurn: number,
): ContextTurn[] {
  const turns: ContextTurn[] = [];
  for (const item of items) {
    if ("role" in item) turns.push({ role: item.role, text: clip(item.text, maxCharsPerTurn) });
    else if (item.type === "summary") {
      turns.push({ role: "summary", text: clip(item.text, maxCharsPerTurn) });
    }
  }
  return turns.slice(-maxTurns);
}

/** Renders the readable turns as a plain transcript, for the summarising call. */
export function toTranscript(items: readonly HistoryItem[]): string {
  const lines: string[] = [];
  for (const item of items) {
    if ("role" in item) {
      lines.push(`${item.role === "user" ? "Visitor" : "Assistant"}: ${item.text}`);
    } else if (item.type === "summary") {
      lines.push(`Earlier summary: ${item.text}`);
    }
  }
  return lines.join("\n\n");
}
