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

/** Builds the verdict a gate returns when it does not block, including when it could not run. */
export function allowed(reason: string): GuardrailVerdict {
  return { tripwireTriggered: false, category: "allowed", reason };
}
