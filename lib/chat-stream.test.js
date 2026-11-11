import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EMPTY_MESSAGE,
  INTERRUPTED_MESSAGE,
  endOfStreamMessage,
  httpErrorMessage,
  isCompletion,
  splitSseBuffer,
  streamErrorMessage,
} from "../static/chat-stream.js";
import {
  createHistory,
  isRefusal,
  recordTurn,
  replacementHistory,
} from "../static/chat-history.js";

describe("splitSseBuffer", () => {
  it("returns the data payloads of complete lines and keeps the partial one", () => {
    const { payloads, rest } = splitSseBuffer(
      'event: x\ndata: {"a":1}\n\n: comment\ndata:{"b":2}\r\ndata: {"c"',
    );
    assert.deepEqual(payloads, ['{"a":1}', '{"b":2}']);
    assert.equal(rest, 'data: {"c"');
  });

  it("reads a final line once a newline is appended", () => {
    assert.deepEqual(splitSseBuffer("data: [DONE]\n").payloads, ["[DONE]"]);
  });
});

describe("streamErrorMessage", () => {
  it("is empty for ordinary events", () => {
    assert.equal(streamErrorMessage({ type: "response.output_text.delta", delta: "Hi" }), "");
    assert.equal(streamErrorMessage({ choices: [{ delta: { content: "Hi" } }] }), "");
    assert.equal(streamErrorMessage(null), "");
  });

  it("reads the proxy's error event in both shapes", () => {
    assert.equal(streamErrorMessage({ error: { message: "Interrupted." } }), "Interrupted.");
    assert.equal(streamErrorMessage({ error: "Streaming Error: reset" }), "Streaming Error: reset");
  });

  it("reads Responses API failures", () => {
    assert.equal(streamErrorMessage({ type: "error", message: "Rate limited" }), "Rate limited");
    assert.equal(
      streamErrorMessage({
        type: "response.failed",
        response: { error: { message: "Server error" } },
      }),
      "Server error",
    );
    assert.match(
      streamErrorMessage({
        type: "response.incomplete",
        response: { incomplete_details: { reason: "max_output_tokens" } },
      }),
      /length limit/,
    );
  });

  it("treats a Chat Completions reply cut short as a failure", () => {
    assert.match(
      streamErrorMessage({ choices: [{ delta: {}, finish_reason: "length" }] }),
      /length limit/,
    );
    assert.match(
      streamErrorMessage({ choices: [{ delta: {}, finish_reason: "content_filter" }] }),
      /content filter/,
    );
    assert.equal(streamErrorMessage({ choices: [{ delta: {}, finish_reason: "stop" }] }), "");
    assert.equal(
      streamErrorMessage({ choices: [{ delta: { content: "Hi" }, finish_reason: null }] }),
      "",
    );
  });

  it("always says something when a failure carries no message", () => {
    assert.notEqual(streamErrorMessage({ type: "response.failed", response: {} }), "");
    assert.notEqual(streamErrorMessage({ type: "response.incomplete", response: {} }), "");
    assert.notEqual(streamErrorMessage({ error: {} }), "");
  });
});

describe("isCompletion", () => {
  it("recognises the end of either API's stream", () => {
    assert.equal(isCompletion("[DONE]", null), true);
    assert.equal(isCompletion("{}", { type: "response.completed", response: {} }), true);
    assert.equal(isCompletion("{}", { choices: [{ delta: {}, finish_reason: "stop" }] }), true);
  });

  it("is false for events in the middle of a reply", () => {
    assert.equal(isCompletion("{}", { type: "response.output_text.delta", delta: "Hi" }), false);
    assert.equal(
      isCompletion("{}", { choices: [{ delta: { content: "Hi" }, finish_reason: null }] }),
      false,
    );
    assert.equal(isCompletion("{}", { type: "response.failed" }), false);
  });
});

describe("httpErrorMessage", () => {
  it("prefers the proxy's own error text", () => {
    assert.equal(
      httpErrorMessage(413, '{"error":"This conversation is too long."}'),
      "This conversation is too long.",
    );
  });

  it("explains a platform timeout, whose body is not JSON", () => {
    assert.match(httpErrorMessage(504, "An error occurred with your deployment"), /timed out/);
  });

  it("falls back to the status", () => {
    assert.equal(httpErrorMessage(500, ""), "Request failed with status 500.");
  });
});

describe("endOfStreamMessage", () => {
  it("is empty for a complete reply", () => {
    assert.equal(endOfStreamMessage({ completed: true, hasText: true, failed: false }), "");
  });

  it("reports a stream that stopped without finishing, with or without text", () => {
    assert.equal(
      endOfStreamMessage({ completed: false, hasText: false, failed: false }),
      INTERRUPTED_MESSAGE,
    );
    assert.equal(
      endOfStreamMessage({ completed: false, hasText: true, failed: false }),
      INTERRUPTED_MESSAGE,
    );
  });

  it("reports a reply that finished with no text", () => {
    assert.equal(
      endOfStreamMessage({ completed: true, hasText: false, failed: false }),
      EMPTY_MESSAGE,
    );
  });

  it("stays quiet when an error was already shown", () => {
    assert.equal(endOfStreamMessage({ completed: false, hasText: false, failed: true }), "");
  });
});

describe("client history", () => {
  it("appends a completed turn without changing the previous history", () => {
    const before = createHistory();
    const after = recordTurn(before, "Hi", "Hello");
    assert.deepEqual(before, []);
    assert.deepEqual(after, [
      { role: "user", text: "Hi" },
      { role: "assistant", text: "Hello" },
    ]);
  });

  it("does not record a turn with no answer", () => {
    const history = [{ role: "user", text: "Hi" }];
    assert.equal(recordTurn(history, "Again", ""), history);
  });

  it("reads a compacted history from the replacement event only", () => {
    const compacted = [{ type: "summary", text: "Drones." }];
    assert.deepEqual(
      replacementHistory({ type: "chat.history.replaced", history: compacted }),
      compacted,
    );
    assert.equal(replacementHistory({ type: "response.completed", history: compacted }), null);
    assert.equal(replacementHistory({ type: "chat.history.replaced" }), null);
  });

  it("recognises a refusal", () => {
    assert.equal(isRefusal({ type: "chat.refusal", category: "off_topic" }), true);
    assert.equal(isRefusal({ type: "response.completed" }), false);
  });
});
