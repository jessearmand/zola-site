+++
title = "Dual-Stream LLM Responses: Adding Live Search to a Static Site Chat"
date = 2025-06-15T10:00:00+08:00
tags = ["zola", "serverless", "streaming", "AI", "LLM", "live search", "race conditions"]
+++

In my [previous post](/2025-06-05-how-to-add-chat-to-zola/), I detailed how to add an AI-powered chat interface to a Zola static site, allowing visitors to ask questions about my resume. The solution used a serverless function to securely call the OpenRouter API, with the AI's response grounded in my resume data.

While effective, this approach had a limitation: it couldn't answer questions about current events or topics outside my resume. To address this, I decided to enhance the chat by adding a second, live web search response that follows the initial, context-based answer. This post explores the journey of implementing this "dual-stream" architecture, the surprising client-side challenges we faced, and the elegant solutions we found.

## The Dual-Stream Architecture

The goal was to provide two distinct answers from a single user question:
1.  An initial response from a model (like OpenAI's GPT via OpenRouter) that has my resume as context.
2.  A second response from a model with live web search capabilities (like x.ai's Grok) to provide up-to-date, external information.

This is achieved by orchestrating two separate API calls within a single serverless function, streaming both responses back to the client over the same HTTP connection.

### Server-Side Implementation (`api/chat-proxy.ts`)

The core of the logic resides in our Vercel serverless function. It now performs two sequential `fetch` calls.

1.  **First Stream (OpenRouter):** The function first calls the OpenRouter API, providing the user's question combined with the resume data. We use `for await...of` to read the response stream and pipe each chunk directly to the client. This is the most reliable way to handle Node.js streams and know precisely when they have finished.

2.  **Injecting a Separator:** Once the first stream is complete, we need a way to signal to the client that the second response is about to begin. We do this by writing a special, hardcoded Server-Sent Event (SSE) to the stream. This is a simple yet effective trick.
    ```typescript
    // In api/chat-proxy.ts, after the first stream finishes
    res.write('data: {"choices":[{"delta":{"content":"<br><hr><br>"}}]}\n\n');
    await streamXaiSearch();
    ```

3.  **Second Stream (x.ai Live Search):** We then call a helper function, `streamXaiSearch()`, which makes the second API call to x.ai. Crucially, this call sends *only* the user's original question, prompting the model to perform a live web search. The response from this second call is streamed back on the same connection, which is finally closed when the stream ends.

This server-side logic is robust, but it introduces complexity on the client that led to some tricky bugs.

### Client-Side Challenges and The Final Solution

The initial implementation on the client was simple: keep reading from the stream and appending content to a single `<p>` tag. This led to two major problems.

#### 1. The Race Condition and the Disappearing Separator

My first attempt to show a separation between the two responses was inconsistent. Sometimes the `<hr>` tag would appear, and sometimes it wouldn't. The culprit was a race condition.

The OpenRouter stream ends with a `data: [DONE]` message. My client-side code was initially designed to stop processing when it saw this. However, if the network delivered the `[DONE]` message in the same packet as our custom separator and the beginning of the x.ai stream, my logic would see `[DONE]`, clear its processing buffer, and inadvertently discard the data that came right after it.

The first fix was simple: instead of stopping at `[DONE]`, the client just ignores it and continues processing, letting the browser's `fetch` handle the true end of the connection.

#### 2. The UI Problem and The Smart Client Solution

While ignoring `[DONE]` fixed the data loss, it created a UI mess. Both AI responses and the separator were being crammed into a single HTML paragraph.

The final, elegant solution was to make the client-side JavaScript "smarter." Instead of just rendering the separator string, it now recognizes it as a special command.

When the client receives the `"<br><hr><br>"` signal, it:
1.  Stops appending to the current paragraph.
2.  Creates a proper `<hr>` element for a clean visual break.
3.  Creates a brand new `<p>` element, prefixed with "Live Search:", to receive the tokens from the second stream.

Here is the key snippet from `templates/chat.html`:
```javascript
// Check for our special separator signal from the server
if (content === '<br><hr><br>') {
  // 1. Append a visual separator to the main output
  const hr = document.createElement('hr');
  hr.style.cssText = 'margin: 0.8rem 0; border: none; border-top: 1px solid #eee;';
  output.appendChild(hr);

  // 2. Create a new paragraph for the live search results
  aiP = document.createElement('p');
  aiP.style.margin = '0.5rem 0';
  aiP.innerHTML = '<strong>Live Search:</strong> ';
  output.appendChild(aiP);
  continue; // Skip rendering the signal itself
}
```
This approach makes the client an active participant in orchestrating the UI, leading to a clean, reliable, and professional-looking result.

## Is This a Limitation of Static Sites?

It's tempting to think this complexity is a fundamental limitation of static site generators, but that's not the case. The "static" part of Zola refers to the pre-built HTML, CSS, and JavaScript. The dynamic functionality comes from the Jamstack architecture, where serverless functions handle backend logic.

The challenge we faced—orchestrating two asynchronous streams over a single connection and updating the UI accordingly—would be just as complex in a traditional monolithic web application. The problem lies in the nature of real-time streaming, not in the static site generator itself. In fact, this project demonstrates the immense power and flexibility of combining a fast static site with scalable serverless functions.

### Future Improvements

While the current system works well, there are several ways it could be improved:
-   **Smarter Orchestration:** The serverless function could analyze the user's query first. If it's clearly about my resume (e.g., "What was your role at...?"), it could skip the expensive live search call entirely.
-   **Better UI/UX:** Instead of one continuous stream, the interface could render two distinct "cards" for the responses, each with its own loading indicator. This would provide clearer feedback to the user.
-   **Consolidated API:** A more advanced approach would be to use a single AI provider that supports grounding on both uploaded documents and live web search in one call. This would greatly simplify the server-side logic, though potentially at the cost of flexibility or price.

## Conclusion

Adding a dual-stream, multi-model response to a static site chat was a fascinating challenge. It pushed the boundaries of what's possible with a Jamstack architecture and highlighted the importance of careful state management on both the server and the client. The key takeaway is that with clever use of serverless functions and intelligent client-side logic, you can build highly dynamic, sophisticated features on a fast, secure, and scalable static site foundation.
