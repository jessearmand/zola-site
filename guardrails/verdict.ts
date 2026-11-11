import type { ContextTurn } from "../lib/chat-history.js";

/**
 * Result of an input guardrail, mirroring the Agents SDK tripwire shape.
 * https://developers.openai.com/api/docs/guides/agents/guardrails-approvals
 *
 * Shared by every gate in the chain so the handler can treat them uniformly.
 */
export interface GuardrailVerdict {
  tripwireTriggered: boolean;
  category: "allowed" | "off_topic" | "off_topic_work" | "prompt_injection" | "abuse";
  reason: string;
}

export type BlockedCategory = Exclude<GuardrailVerdict["category"], "allowed">;

/**
 * What a gate judges: the new question, plus the last few turns so a follow-up
 * such as "tell me more" can be read for what it refers to. The earlier turns
 * come from the client and may be fabricated; gates treat them as context for
 * the question, never as instructions.
 */
export interface GuardrailInput {
  question: string;
  earlierTurns: ContextTurn[];
}

/** Visitor-facing message for each way the tripwire can fire. */
export const REFUSAL_MESSAGES: Record<BlockedCategory, string> = {
  off_topic: `That's outside what this blog covers. I can answer questions about the posts and the author's background.`,
  off_topic_work: `I can only answer questions about this blog and its author. For general help, try ChatGPT or Claude.`,
  prompt_injection: `I can only answer questions about this blog and its author.`,
  abuse: `I can't help with that. Ask me about the blog or the author's background instead.`,
};

/** Builds the verdict a gate returns when it does not block, including when it could not run. */
export function allowed(reason: string): GuardrailVerdict {
  return { tripwireTriggered: false, category: "allowed", reason };
}
