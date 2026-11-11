import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stripCitationMarkers } from "../static/chat-citations.js";

const marker = (...refs) => `filecite${refs.join("")}`;

describe("stripCitationMarkers", () => {
  it("leaves text without markers unchanged", () => {
    assert.equal(stripCitationMarkers("Plain **answer**."), "Plain **answer**.");
  });

  it("removes a marker and the space before it", () => {
    const text = `there is no indication that he worked there. ${marker("turn0file0", "turn0file1")}`;
    assert.equal(stripCitationMarkers(text), "there is no indication that he worked there.");
  });

  it("removes several markers in the middle of text", () => {
    const text = `He studied at ITB ${marker("turn0file0")}. He worked in Singapore ${marker("turn0file1")}.`;
    assert.equal(stripCitationMarkers(text), "He studied at ITB. He worked in Singapore.");
  });

  it("keeps newlines around a marker", () => {
    const text = `First line ${marker("turn0file0")}\n\nSecond line`;
    assert.equal(stripCitationMarkers(text), "First line\n\nSecond line");
  });

  it("hides a marker that is still streaming", () => {
    assert.equal(stripCitationMarkers("worked there. fileciteturn0"), "worked there.");
  });

  it("gives the same result when a marker arrives across deltas", () => {
    const full = `Answer ${marker("turn0file0")} done.`;
    let buffer = "";
    for (const chunk of full.match(/.{1,3}/gsu)) buffer += chunk;
    assert.equal(stripCitationMarkers(buffer), "Answer done.");
  });

  it("removes stray delimiters from a malformed marker", () => {
    assert.equal(stripCitationMarkers("text more"), "text more");
  });
});
