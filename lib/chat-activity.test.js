import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DOT_STEP_MS,
  createActivity,
  dotCount,
  progressLabel,
  progressVisual,
  reduceActivity,
} from "../static/chat-activity.js";

describe("progress frames", () => {
  it("cycles Thinking. → Thinking.. → Thinking... → Thinking.", () => {
    assert.equal(DOT_STEP_MS, 1000);
    assert.deepEqual(
      [0, 1, 2, 3].map((step) => progressVisual("thinking", step)),
      ["Thinking.", "Thinking..", "Thinking...", "Thinking."],
    );
    assert.deepEqual(
      [0, 1, 2].map((step) => progressVisual("reading", step)),
      ["Reading.", "Reading..", "Reading..."],
    );
  });

  it("keeps the accessible label free of the cycling dots", () => {
    assert.equal(progressLabel("thinking"), "Thinking");
    assert.equal(progressLabel("reading"), "Reading");
    assert.equal(progressLabel("done"), "Thinking");
    assert.deepEqual([0, 1, 2, 3, -1].map(dotCount), [1, 2, 3, 1, 3]);
  });
});

describe("reduceActivity", () => {
  it("starts at thinking and ignores lifecycle events that are not a search", () => {
    const initial = createActivity();
    assert.equal(initial.phase, "thinking");
    const next = [
      { type: "response.created" },
      { type: "response.in_progress" },
      {
        type: "response.output_item.added",
        output_index: 0,
        item: { id: "rs_1", type: "reasoning" },
      },
      { type: "response.output_text.delta", delta: "" },
    ].reduce((state, event) => reduceActivity(state, event), initial);
    assert.equal(next.phase, "thinking");
    assert.equal(next, reduceActivity(next, { type: "response.created" }));
  });

  it("shows reading for web and file search events, then thinking when they finish", () => {
    const phases = [];
    let state = createActivity();
    const events = [
      {
        type: "response.output_item.added",
        output_index: 1,
        item: { id: "ws_1", type: "web_search_call", status: "in_progress" },
      },
      { type: "response.web_search_call.in_progress", item_id: "ws_1", output_index: 1 },
      { type: "response.web_search_call.searching", item_id: "ws_1", output_index: 1 },
      { type: "response.file_search_call.in_progress", item_id: "fs_1", output_index: 2 },
      { type: "response.file_search_call.searching", item_id: "fs_1", output_index: 2 },
      // Web search finished; file search is still open.
      { type: "response.web_search_call.completed", item_id: "ws_1", output_index: 1 },
      {
        type: "response.output_item.done",
        output_index: 1,
        item: { id: "ws_1", type: "web_search_call", status: "completed" },
      },
      { type: "response.file_search_call.completed", item_id: "fs_1", output_index: 2 },
      {
        type: "response.output_item.added",
        output_index: 3,
        item: { id: "rs_2", type: "reasoning" },
      },
      { type: "response.reasoning_summary_text.delta", delta: "checking the post" },
    ];
    for (const event of events) {
      state = reduceActivity(state, event);
      phases.push(state.phase);
    }
    assert.deepEqual(phases, [
      "reading",
      "reading",
      "reading",
      "reading",
      "reading",
      "reading",
      "reading",
      "thinking",
      "thinking",
      "thinking",
    ]);
  });

  it("stays on reading while a search is open even if reasoning events arrive", () => {
    let state = reduceActivity(createActivity(), {
      type: "response.web_search_call.searching",
      item_id: "ws_1",
      output_index: 0,
    });
    state = reduceActivity(state, {
      type: "response.reasoning_summary_text.delta",
      delta: "still looking",
    });
    state = reduceActivity(state, {
      type: "response.output_item.added",
      output_index: 1,
      item: { id: "rs_1", type: "reasoning" },
    });
    assert.equal(state.phase, "reading");
  });

  it("returns to thinking from a file-search output item alone", () => {
    let state = reduceActivity(createActivity(), {
      type: "response.output_item.added",
      output_index: 0,
      item: { id: "fs_1", type: "file_search_call", status: "searching" },
    });
    assert.equal(state.phase, "reading");
    state = reduceActivity(state, {
      type: "response.output_item.done",
      output_index: 0,
      item: { id: "fs_1", type: "file_search_call", status: "incomplete" },
    });
    assert.equal(state.phase, "thinking");
  });

  it("does not enter reading when the search item is already terminal", () => {
    const state = reduceActivity(createActivity(), {
      type: "response.output_item.added",
      output_index: 0,
      item: { id: "ws_1", type: "web_search_call", status: "completed" },
    });
    assert.equal(state.phase, "thinking");
  });

  it("matches a call that identifies itself only by item_id", () => {
    let state = reduceActivity(createActivity(), {
      type: "response.file_search_call.in_progress",
      item_id: "fs_only",
    });
    assert.equal(state.phase, "reading");
    state = reduceActivity(state, {
      type: "response.file_search_call.completed",
      item_id: "fs_only",
    });
    assert.equal(state.phase, "thinking");
  });

  it("ends the indicator when answer text starts", () => {
    let state = reduceActivity(createActivity(), {
      type: "response.web_search_call.searching",
      item_id: "ws_1",
      output_index: 0,
    });
    state = reduceActivity(state, { type: "response.output_text.delta", delta: "The post says" });
    assert.equal(state.phase, "done");
    assert.deepEqual(state.calls, []);
    // A late search event must not bring the indicator back.
    state = reduceActivity(state, {
      type: "response.web_search_call.searching",
      item_id: "ws_2",
      output_index: 4,
    });
    assert.equal(state.phase, "done");
  });

  it("ends the indicator on a chat-completions delta", () => {
    const state = reduceActivity(createActivity(), {
      choices: [{ delta: { content: "Hello" } }],
    });
    assert.equal(state.phase, "done");
  });

  it("returns to thinking when a search event fails", () => {
    let state = reduceActivity(createActivity(), {
      type: "response.web_search_call.in_progress",
      item_id: "ws_1",
      output_index: 0,
    });
    state = reduceActivity(state, {
      type: "response.web_search_call.failed",
      item_id: "ws_1",
      output_index: 0,
    });
    assert.equal(state.phase, "thinking");
  });

  it("ends the indicator on stream and response errors", () => {
    assert.equal(
      reduceActivity(createActivity(), { type: "error", message: "nope" }).phase,
      "done",
    );
    assert.equal(
      reduceActivity(createActivity(), { error: "Streaming Error: reset" }).phase,
      "done",
    );
    assert.equal(reduceActivity(createActivity(), { type: "response.failed" }).phase, "done");
    assert.equal(reduceActivity(createActivity(), { type: "response.incomplete" }).phase, "done");
  });
});
