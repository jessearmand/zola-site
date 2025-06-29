+++
title = "Streaming APIs: OpenAI's Responses vs. Chat Completions"
date = 2025-06-29T11:00:00+08:00
+++

Recently, I upgraded the chat assistant on this site to use OpenAI's latest `v1/responses` API, moving away from the more traditional `v1/chat/completions` endpoint. This change was driven by the desire to integrate native web search capabilities into the model's responses. The process revealed some interesting differences in their streaming architecture, which are worth discussing.

Here's a breakdown of the two APIs from a developer's perspective, especially when handling Server-Sent Events (SSE).

### The Classic: Chat Completions API (`/v1/chat/completions`)

The Chat Completions API has been the standard for building conversational AI for some time. When used in streaming mode, it sends a sequence of events that are relatively straightforward to parse.

**Pros:**

*   **Simplicity and Predictability:** The streaming format is simple. Each message is a JSON object containing a `choices` array, and inside that, a `delta` object with the `content` token. This structure is consistent and easy to parse on the client-side.
*   **Widespread Adoption:** Being the older standard, there are countless examples, tutorials, and libraries built around this format. Most third-party services that offer OpenAI-compatible endpoints (like OpenRouter, which I was using) adhere to this structure.
*   **Directness:** You get exactly what you need in each chunk: the next piece of text. There is very little metadata or other event types to handle during the main content stream.

**Cons:**

*   **Limited Native Features:** Advanced features like web search or code interpretation are not built-in. To add them, you have to implement your own logic, often by chaining multiple API calls (as I did with the xAI search fallback).
*   **Less Informative Events:** The stream is primarily text deltas. You don't get explicit events about the model's lifecycle, such as when a tool is being called or when the response is fully complete.

Here’s a simplified look at what a client-side parser for this stream does:

```javascript
// Simplified logic for Chat Completions stream
if (parsed.choices && parsed.choices[0].delta) {
  const content = parsed.choices[0].delta.content || '';
  if (content) {
    render(content);
  }
}
```

### The Newcomer: Responses API (`/v1/responses`)

The Responses API is OpenAI's next-generation endpoint, designed to be more of a state machine that handles complex, multi-tool interactions natively. This is immediately apparent in its event-driven streaming format.

**Pros:**

*   **Rich, Event-Driven Protocol:** The stream is a series of distinct, typed events: `response.created`, `response.output_item.added`, `response.output_text.delta`, `response.completed`, etc. This provides a much clearer picture of the model's lifecycle. You know exactly when a search is happening versus when text is being generated.
*   **Native Tool Integration:** Features like web search are first-class citizens. Enabling it is as simple as adding a tool to the request. The API handles the search, and the response stream even includes citation data automatically.
*   **Structured Final Output:** The `response.completed` event contains the full, finalized response object, including usage statistics and all generated content with annotations. This is incredibly useful for logging, analysis, or storing the final result without having to reassemble it from deltas.

**Cons:**

*   **Increased Client-Side Complexity:** The event-driven nature means the client-side parser has to be more sophisticated. Instead of just looking for a text delta, you need a `switch` statement or a handler map for different event types (`event.type`).
*   **Verbosity:** The stream is much noisier. You receive many metadata events before and after the actual text content, which can feel like overkill if all you need is a simple text response.
*   **New and Evolving:** As a newer API, there are fewer community resources and examples available. Developers need to rely more heavily on the official documentation, which is still evolving.

Here’s how the client-side logic changes:

```javascript
// Simplified logic for Responses API stream
switch (parsed.type) {
  case 'response.output_text.delta':
    render(parsed.delta || '');
    break;
  case 'response.completed':
    // Finalize the response, collect all citations
    collectCitations(parsed.response.output);
    break;
  // ... handle other event types
}
```

### Conclusion

For simple, direct chat applications, the **Chat Completions API** remains a perfectly viable and simpler choice. Its straightforward streaming format is easy to implement and widely understood.

However, for building more advanced, agent-like experiences that require integrated tools like web search, the **Responses API** is the clear winner, despite its added complexity. The event-driven protocol gives you a much more robust and transparent way to handle the model's lifecycle. The native integration of tools and structured data like citations saves significant development effort that would otherwise be spent on chaining API calls and post-processing results.

For my own site, the switch was worth the effort. It simplified the backend by removing the need for a secondary search provider and enriched the user experience by providing properly attributed, up-to-date information directly from the primary model.
