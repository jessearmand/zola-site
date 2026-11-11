import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_GATEWAY_FALLBACK_MODEL,
  OPENAI_MODEL,
  contextBudget,
  contextWindowFor,
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

describe("context budget", () => {
  it("gives both answer models a 1M-token window", () => {
    assert.equal(contextWindowFor("openai_web_search"), 1_000_000);
    assert.equal(contextWindowFor("ai_gateway"), 1_000_000);
  });

  it("compacts at 25% of the window and refuses history above 50%", () => {
    assert.deepEqual(contextBudget(1_000_000), {
      compactAtTokens: 250_000,
      maxHistoryTokens: 500_000,
    });
  });
});
