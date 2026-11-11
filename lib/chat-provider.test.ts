import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_GATEWAY_FALLBACK_MODEL,
  OPENAI_MODEL,
  resolveAnswerProvider,
} from "./chat-provider.ts";

describe("chat provider constants", () => {
  it("uses gpt-6-luna and the verified AI Gateway DeepSeek id", () => {
    assert.equal(OPENAI_MODEL, "gpt-6-luna");
    assert.equal(AI_GATEWAY_FALLBACK_MODEL, "deepseek/deepseek-v4.1-flash-1017");
  });
});

describe("resolveAnswerProvider", () => {
  it("prefers OpenAI web search when OpenAI credentials exist", () => {
    assert.equal(resolveAnswerProvider(true), "openai_web_search");
  });

  it("falls back to AI Gateway when OpenAI is not configured", () => {
    assert.equal(resolveAnswerProvider(false), "ai_gateway");
  });
});
