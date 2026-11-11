/**
 * Chat answer routing for `api/chat-proxy.ts`.
 *
 * Prefer OpenAI Responses with `web_search` (+ file search when configured).
 * When OpenAI credentials are absent, fall back to a Chat Completions model
 * through Vercel AI Gateway — the same auth path the Jev guardrail already uses.
 *
 * Kept free of local `.js` imports so the Node strip-types test runner can load
 * this module directly (same pattern as the other `lib/*.test.ts` files).
 */

export const OPENAI_MODEL = "gpt-6-luna";

// Reasoning effort for the OpenAI Responses API. `low` keeps latency down for a
// latency-sensitive chat widget while still allowing tool use (web + file search).
// GPT-6 Luna supports none | low | medium | high | xhigh | max.
// https://developers.openai.com/api/docs/models/gpt-6-luna
export const OPENAI_REASONING_EFFORT = "low";

// Default level of detail via `text.verbosity` (low | medium | high).
export const OPENAI_VERBOSITY = "medium";

/** AI Gateway Chat Completions fallback when OpenAI is not configured. */
export const AI_GATEWAY_FALLBACK_MODEL = "deepseek/deepseek-v4.1-flash-1017";

export const AI_GATEWAY_CHAT_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

export type AnswerProvider = "openai_web_search" | "ai_gateway";

/**
 * Picks the answer path from whether OpenAI credentials are present.
 *
 * OpenAI wins whenever it is configured (including a partial WIF setup that
 * should fail loudly). Otherwise the caller streams through AI Gateway.
 */
export function resolveAnswerProvider(hasOpenAI: boolean): AnswerProvider {
  return hasOpenAI ? "openai_web_search" : "ai_gateway";
}
