/**
 * Chat client for /chat.
 *
 * Streams SSE from /api/chat-proxy and renders it incrementally. Model output
 * is never assigned as raw HTML — it goes through renderMarkdown(), which
 * escapes first and then applies a fixed set of formatting rules.
 *
 * Until the first answer delta, the assistant slot shows a progress label:
 * "Thinking" while the guardrail and the model are working, "Reading" while a
 * web or file search call is in flight. The dot cycle lives in the DOM; the
 * phase rules live in chat-activity.js.
 */
import { renderMarkdown, escapeHtml } from "./markdown.js";
import { createHistory, isRefusal, recordTurn, replacementHistory } from "./chat-history.js";
import {
  endOfStreamMessage,
  httpErrorMessage,
  isCompletion,
  splitSseBuffer,
  streamErrorMessage,
} from "./chat-stream.js";
import {
  DOT_STEP_MS,
  createActivity,
  extractDelta,
  progressLabel,
  progressVisual,
  reduceActivity,
} from "./chat-activity.js";

const ENDPOINT = "/api/chat-proxy";

/**
 * "Thinking." / "Reading..." in the assistant slot.
 *
 * The live region holds only the stable word, so a screen reader announces
 * "Thinking" or "Reading" once and does not hear each dot. The cycling dots
 * are aria-hidden and fade unless the user prefers reduced motion, in which
 * case the stylesheet drops the fade and the text still steps once a second.
 */
function createIndicator(el, label) {
  const live = document.createElement("span");
  live.className = "chat-status-live";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");

  const visual = document.createElement("span");
  visual.className = "chat-status-visual";
  visual.setAttribute("aria-hidden", "true");

  const status = document.createElement("span");
  status.className = "chat-status";
  status.append(live, visual);

  const strong = document.createElement("strong");
  strong.textContent = label;
  el.replaceChildren(strong, document.createTextNode(" "), status);

  let phase = "";
  let step = 0;
  let timer = 0;

  const paint = () => {
    visual.textContent = progressVisual(phase, step);
    // Restart the fade on each step. Removing the class and forcing a reflow
    // is what makes the animation run again; reduced motion disables it in CSS.
    visual.classList.remove("is-fading");
    void visual.offsetWidth;
    visual.classList.add("is-fading");
  };

  return {
    /** @param {"thinking" | "reading"} next */
    setPhase(next) {
      if (next === phase) return;
      phase = next;
      live.textContent = progressLabel(next);
      step = 0;
      paint();
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(() => {
        step += 1;
        paint();
      }, DOT_STEP_MS);
    },
    stop() {
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    },
  };
}

/** A bot turn that re-renders its accumulated markdown as deltas arrive. */
function createTurn(output, label) {
  const el = document.createElement("div");
  el.className = "chat-turn";
  output.appendChild(el);

  let markdown = "";
  let pending = false;
  let paintGen = 0;
  /** @type {"thinking" | "reading" | "done"} */
  let phase = "thinking";
  const indicator = createIndicator(el, label);
  indicator.setPhase("thinking");
  // The old initial paint scrolled here. Without it, a transcript taller than
  // .chat-output hides the new question and the Thinking/Reading label until
  // the answer arrives.
  output.scrollTop = output.scrollHeight;

  const renderAnswer = () => {
    indicator.stop();
    el.innerHTML = `<strong>${escapeHtml(label)}</strong> ${renderMarkdown(markdown)}`;
    output.scrollTop = output.scrollHeight;
  };

  const scheduleAnswer = () => {
    if (pending) return;
    pending = true;
    const gen = ++paintGen;
    requestAnimationFrame(() => {
      if (gen !== paintGen) return;
      pending = false;
      renderAnswer();
    });
  };

  return {
    /** @param {"thinking" | "reading" | "done"} next */
    setPhase(next) {
      if (phase === "done" || next === phase || next === "done") return;
      phase = next;
      indicator.setPhase(next);
    },
    append(text) {
      markdown += text;
      phase = "done";
      // Coalesce to one paint per frame; a long answer arrives as hundreds of
      // deltas and each one re-renders the whole buffer. The indicator stays
      // up until that paint so the slot doesn't flash empty.
      scheduleAnswer();
    },
    /** Drops the progress label. Used when the turn fails before any text. */
    abandon() {
      phase = "done";
      paintGen += 1;
      pending = false;
      indicator.stop();
      const status = el.querySelector(".chat-status");
      if (status) status.remove();
    },
    /** Paints the answer, or removes the slot when the turn produced no text. */
    finish() {
      phase = "done";
      paintGen += 1;
      pending = false;
      indicator.stop();
      if (!markdown) {
        el.remove();
        return;
      }
      renderAnswer();
    },
  };
}

function addUserTurn(output, question) {
  const el = document.createElement("div");
  el.className = "chat-turn";
  el.innerHTML = `<strong>You:</strong> ${escapeHtml(question)}`;
  output.appendChild(el);
}

function addError(output, message) {
  const el = document.createElement("p");
  el.className = "chat-error";
  el.innerHTML = `<strong>Error:</strong> ${escapeHtml(message)}`;
  output.appendChild(el);
}

function addSources(output, citations) {
  if (!citations.size) return;

  const el = document.createElement("p");
  el.className = "chat-sources";
  const refs = [...citations.entries()].map(([key, value]) => {
    if (key.startsWith("file:")) {
      return `<span title="Source file">${escapeHtml(value)}</span>`;
    }
    const domain = key.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    return `<a href="${escapeHtml(key)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(value)}">${escapeHtml(domain)}</a>`;
  });
  el.innerHTML = `<em>Sources:</em> ${refs.join(", ")}`;
  output.appendChild(el);
}

function collectCitations(parsed, citations) {
  // Responses API: annotations arrive on the completed message.
  if (parsed.type === "response.completed" && parsed.response?.output) {
    for (const item of parsed.response.output) {
      if (item.type !== "message" || !item.content) continue;
      for (const part of item.content) {
        if (part.type !== "output_text" || !part.annotations) continue;
        for (const a of part.annotations) {
          if (a.type === "url_citation" && a.url) {
            citations.set(a.url, a.title || "");
          } else if (a.type === "file_citation" && a.filename) {
            citations.set(`file:${a.file_id}`, `📄 ${a.filename}`);
          }
        }
      }
    }
  }

  // Chat Completions (AI Gateway fallback)
  if (parsed.choices && parsed.choices[0].delta?.annotations) {
    for (const a of parsed.choices[0].delta.annotations) {
      if (a.type === "url_citation" && a.url_citation?.url) {
        citations.set(a.url_citation.url, a.url_citation.title || "");
      }
    }
  }
}

/**
 * The conversation so far, sent with every question. It lives only in this
 * page: reloading starts a new conversation.
 */
let history = createHistory();

/**
 * Applies one SSE payload to the turn being streamed.
 * @param {string} data Raw `data:` payload.
 * @param {object} state Mutable state for this request.
 */
function handlePayload(data, state) {
  let parsed = null;
  if (data !== "[DONE]") {
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
  }

  if (isCompletion(data, parsed)) state.completed = true;
  if (!parsed) return;

  const replacement = replacementHistory(parsed);
  if (replacement) {
    state.history = replacement;
    return;
  }
  if (isRefusal(parsed)) {
    state.refused = true;
    return;
  }

  const failure = streamErrorMessage(parsed);
  if (failure && !state.failed) {
    state.failed = true;
    addError(state.output, failure);
  }

  const delta = extractDelta(parsed);
  const next = reduceActivity(state.activity, parsed);
  const becameDone = state.activity.phase !== "done" && next.phase === "done";
  state.activity = next;

  // Reasoning models emit reasoning/summary events alongside the answer.
  // The phase update above already ran; only the final answer is rendered.
  if (typeof parsed.type === "string" && parsed.type.startsWith("response.reasoning")) {
    if (becameDone) state.turn.abandon();
    else state.turn.setPhase(state.activity.phase);
    return;
  }

  if (delta) {
    state.answer += delta;
    state.turn.append(delta);
  } else if (becameDone) state.turn.abandon();
  else state.turn.setPhase(state.activity.phase);

  collectCitations(parsed, state.citations);
}

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const button = document.getElementById("chat-send");
  const output = document.getElementById("chat-output");

  const question = input.value.trim();
  if (!question) return;

  addUserTurn(output, question);
  input.value = "";
  input.disabled = true;
  button.disabled = true;

  const state = {
    output,
    turn: createTurn(output, "Bot:"),
    activity: createActivity(),
    citations: new Map(),
    history,
    answer: "",
    completed: false,
    refused: false,
    failed: false,
  };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history }),
    });

    if (!response.ok || !response.body) {
      const bodyText = await response.text().catch(() => "");
      throw new Error(httpErrorMessage(response.status, bodyText));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      // Flush the decoder at the end, and add a newline so a final line the
      // server did not terminate is still read.
      buffer += done ? `${decoder.decode()}\n` : decoder.decode(value, { stream: true });

      const { payloads, rest } = splitSseBuffer(buffer);
      buffer = rest;
      for (const data of payloads) handlePayload(data, state);

      if (done) break;
    }

    // A stream that just stops (a dropped connection, or a function that ran
    // out of time) carries no error event, so it is detected here.
    const ending = endOfStreamMessage({
      completed: state.completed,
      hasText: !!state.answer,
      failed: state.failed,
    });
    if (ending) {
      state.failed = true;
      addError(output, ending);
    }
  } catch (error) {
    state.failed = true;
    addError(output, error.message || "The request failed. Please try again.");
  } finally {
    state.turn.finish();
    addSources(output, state.citations);

    // Only a turn that finished cleanly joins the conversation. A failed or
    // refused turn is left out, so asking again starts from the same history.
    if (!state.failed && !state.refused) {
      history = recordTurn(state.history, question, state.answer);
    }

    input.disabled = false;
    button.disabled = false;
    input.focus();
    output.scrollTop = output.scrollHeight;
  }
}

document.getElementById("chat-send").addEventListener("click", sendMessage);
document.getElementById("chat-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});
