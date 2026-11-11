import type { AiGatewayCredential } from "./ai-gateway-auth.js";
import {
  fromCompactOutput,
  fromSummaryCompletion,
  toResponsesInput,
  toTranscript,
  type HistoryItem,
} from "./chat-history.js";
import {
  AI_GATEWAY_CHAT_URL,
  AI_GATEWAY_FALLBACK_MODEL,
  OPENAI_COMPACT_URL,
  OPENAI_MODEL,
} from "./chat-provider.js";

// Compaction runs before the answer, in the visitor's critical path. It is
// rare (a conversation has to fill a quarter of the context window first), but
// when it runs it reads the whole history, so it gets a longer bound than the
// guardrails. On a timeout the caller keeps the uncompacted history.
const COMPACTION_TIMEOUT_MS = 20_000;

const SUMMARY_INSTRUCTIONS = `Summarise the conversation below between a visitor and the assistant on a personal blog's chat widget. The summary replaces the conversation in the assistant's context, so keep what a later answer could depend on: what the visitor asked, what the assistant answered and which posts it cited, facts the visitor stated, and anything left unresolved. Write plain prose. Do not address the visitor and do not add anything that was not said.`;

/**
 * Compacts the history with OpenAI's standalone compaction endpoint.
 * https://developers.openai.com/api/docs/guides/compaction
 *
 * The result is the next context window: the turns OpenAI kept verbatim plus
 * one opaque compaction item for the rest. Returns null on any failure, and
 * the caller carries on with the history it had.
 */
export async function compactWithOpenAI(
  bearerToken: string,
  items: readonly HistoryItem[],
): Promise<HistoryItem[] | null> {
  try {
    const apiRes = await fetch(OPENAI_COMPACT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: OPENAI_MODEL, input: toResponsesInput(items) }),
      signal: AbortSignal.timeout(COMPACTION_TIMEOUT_MS),
    });

    if (!apiRes.ok) {
      await apiRes.text().catch(() => "");
      console.warn(`Compaction call failed (${apiRes.status}); keeping the full history.`);
      return null;
    }

    const data = (await apiRes.json()) as { output?: unknown };
    return fromCompactOutput(data.output);
  } catch (error) {
    console.warn("Compaction error; keeping the full history:", error);
    return null;
  }
}

/**
 * Compacts the history for the AI Gateway fallback model by summarising it.
 *
 * OpenAI's compaction item is state only OpenAI models can read, so a model
 * from another provider gets a plain-text summary instead. Returns null on
 * any failure, and the caller carries on with the history it had.
 */
export async function summariseWithAiGateway(
  credential: AiGatewayCredential,
  items: readonly HistoryItem[],
): Promise<HistoryItem[] | null> {
  try {
    const apiRes = await fetch(AI_GATEWAY_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credential.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_GATEWAY_FALLBACK_MODEL,
        messages: [
          { role: "system", content: SUMMARY_INSTRUCTIONS },
          // The transcript is quoted data. The model is told to summarise it,
          // so instructions inside a turn are not followed as instructions.
          { role: "user", content: `Conversation to summarise:\n"""\n${toTranscript(items)}\n"""` },
        ],
      }),
      signal: AbortSignal.timeout(COMPACTION_TIMEOUT_MS),
    });

    if (!apiRes.ok) {
      await apiRes.text().catch(() => "");
      console.warn(
        `Summary call failed (${apiRes.status}, ${credential.source}); keeping the full history.`,
      );
      return null;
    }

    const summary = fromSummaryCompletion(await apiRes.json());
    if (!summary) {
      console.warn("Summary was empty, incomplete or too long; keeping the full history.");
    }
    return summary;
  } catch (error) {
    console.warn("Summary error; keeping the full history:", error);
    return null;
  }
}
