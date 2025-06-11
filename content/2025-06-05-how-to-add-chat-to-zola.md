+++
title = "How to Add a Chat Interface to Zola Static Site Generator"
date = 2025-06-08T23:11:31+08:00
tags = ["zola", "static site generator", "chat interface", "AI", "LLM"]
+++

Static site generators like Zola are fantastic for creating fast, secure, and lightweight websites. However, one limitation of static sites is the lack of dynamic features, such as real-time chat interfaces. In this post, I'll walk you through how I added a chat interface to my Zola-powered blog, allowing visitors to ask questions about my resume using an AI-powered language model (LLM).

## Why Add a Chat Interface?

Adding a chat interface to a static site can enhance user engagement by providing an interactive way for visitors to inquire about specific content, such as a resume or portfolio. By integrating an AI model, you can automate responses based on predefined data, making it a powerful tool for personal branding or customer interaction.

In my case, I wanted a way for potential employers or collaborators to ask questions about my background directly on my site, with responses powered by an LLM using data from my resume.

## Steps to Implement the Chat Interface

### 1. Create a Chat Page in Zola

First, I created a new page in Zola for the chat interface. This involved adding a markdown file at `content/chat.md` with the following front matter and content:

```markdown
+++
title = "Chat with My Resume"
date = 2025-06-08T23:11:31+08:00
path = "chat"
template = "chat.html"
+++

This page allows you to ask questions about my resume using an AI chat interface powered by an LLM.
```

Note the `template = "chat.html"` which tells Zola to use a custom template for rendering this page.

### 2. Design a Custom Template and Match the Theme

This is the most critical step and where pitfalls often occur. To ensure the chat page looks like part of your site, it must correctly inherit from your theme's main template.

For my site, which uses the `lightspeed` theme, the main template is `index.html`, not a generic `base.html`. A common mistake is creating a new `base.html`, which disconnects the page from the theme's styling, header, and footer.

My `templates/chat.html` starts by extending the correct theme template:
```html
{% extends "index.html" %}
```

Inside this template, I structured the content within an `<article>` tag, just like the theme's `page.html`, to ensure consistency.

#### Styling the Chat Interface

The `lightspeed` theme is minimal and doesn't come with a component library like Bootstrap. To make the chat box, input field, and button match the theme, I used inline styles that mimic the theme's aesthetic (e.g., colors, fonts, and spacing).

Here's a simplified view of the HTML structure within the template:
```html
<article>
  <h1>{{ page.title }}</h1>
  <p>{{ page.content | safe }}</p>

  <!-- Chat interface styled to match the theme -->
  <div style="margin-top: 2rem; background: white; padding: 1rem; border: 1px solid #ddd;">
    <div id="chat-output">...</div>
    <div style="display: flex; gap: 0.8rem;">
      <input type="text" id="chat-input" ... >
      <button ... >Send</button>
    </div>
  </div>
</article>
```
This approach ensures the chat component feels native to the site. For more complex styling, using a separate custom CSS file linked in your main template is a better practice.

### 3. Implement Secure API Interaction with a Serverless Function

The biggest challenge with adding dynamic features to a static site is handling secrets like API keys securely. **Never expose your API key in client-side JavaScript.**

The best solution is to use a serverless function as a proxy. The client-side JavaScript on the chat page calls this function, which then securely calls the LLM API on the server-side, using an environment variable to access the API key.

For my deployment on Vercel, I created a serverless function at `api/chat-proxy.js`. Here's how the interaction works:

1.  The user types a message and clicks "Send".
2.  The client-side JavaScript sends a `POST` request to my site's own endpoint: `/api/chat-proxy`.
3.  The Vercel serverless function receives the request, retrieves the `OPENROUTER_API_KEY` from its environment variables, and makes a secure request to the OpenRouter API.
4.  The function returns the AI's response to the client, which then displays it.

The client-side `fetch` call looks like this:
```javascript
// In templates/chat.html
const response = await fetch('/api/chat-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: input, resumeData: resumeData }),
});
```
This way, the API key never leaves the server, and the implementation is secure.

#### Handling Streamed Responses (SSE) in Plain JavaScript

Because our serverless proxy returns the OpenRouter answer as a **Server-Sent
Events (SSE) stream**, the browser must read it incrementally instead of
waiting for a full JSON payload.  You can certainly use the OpenAI or Vercel AI
SDKs, but doing it yourself is a great learning exercise.

```javascript
// POST the user question to the proxy
const response = await fetch('/api/chat-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question }),
});

if (!response.ok || !response.body) {
  throw new Error(`HTTP ${response.status}`);
}

// ---- Read the SSE stream ----
const reader  = response.body.getReader();
const decoder = new TextDecoder();
let   buffer  = '';

// <p> element that grows as tokens arrive
const aiP = document.createElement('p');
aiP.innerHTML = '<strong>Bot:</strong> ';
chatOutput.appendChild(aiP);

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  // Process complete lines from buffer
  while (true) {
    const lineEnd = buffer.indexOf('\n');
    if (lineEnd === -1) break;

    const line = buffer.slice(0, lineEnd).trim();
    buffer     = buffer.slice(lineEnd + 1);

    // Ignore keep-alive comments such as “: OPENROUTER PROCESSING”
    if (!line.startsWith('data: ')) continue;

    const data = line.slice(6);
    if (data === '[DONE]') { buffer = ''; break; }

    try {
      const parsed  = JSON.parse(data);
      const token   = parsed.choices[0].delta?.content;
      if (token) {
        aiP.innerHTML += token.replace(/\n/g, '<br/>');
        chatOutput.scrollTop = chatOutput.scrollHeight;
      }
    } catch { /* ignore badly-formatted lines */ }
  }
}
```

Key take-aways:

1.  `fetch` returns a `ReadableStream`; every chunk is decoded and added to
    a buffer.
2.  Per the SSE spec, each message is on its own line and starts with
    “`data: `”.
3.  The special string `[DONE]` marks the end of the stream.
4.  Comment lines beginning with “:`” are keep-alive pings and can be
    ignored.

Using a library hides these details, but understanding the manual approach
helps demystify how real-time LLM UIs work.

### 4. Add Navigation to the Chat Page

To make the chat page accessible, I updated the footer links in my `config.toml` to include a link to the chat page:

```toml
footer_links = [
    {url = "$BASE_URL/about", name = "About"},
    {url = "$BASE_URL/chat", name = "Chat with Resume"},
    {url = "$BASE_URL/atom.xml", name = "RSS"},
    {url = "https://github.com/carpetscheme/lightspeed", name = "Source on Github"},
]
```

This ensures visitors can easily find the chat interface from any page on my site.

### 5. Test and Deploy

After setting up the page and template, I tested the site locally using `zola serve`. Since the serverless function only runs on a platform like Vercel, local testing of the API call is limited.

For deployment, I pushed the code to Vercel and, most importantly, **set the `OPENROUTER_API_KEY` as an environment variable** in the Vercel project settings. This makes the key available to the serverless function. Once deployed, the chat interface worked securely in the live environment.

### Troubleshooting: The Case of the Missing API Route (404 Error)

After deploying the site, I ran into a frustrating issue: the Zola site loaded perfectly, but any call to my `/api/chat-proxy` endpoint resulted in a `404 Not Found` error.

My first instinct was that the routing was misconfigured. I tried several variations of `vercel.json`, adding explicit `routes` to direct traffic to the API. However, nothing worked.

The key clue was in the Vercel build logs. While the `npm run build` command for Zola executed successfully, there was **no mention of the serverless function being compiled or deployed**. The build process was completely ignoring the `api` directory.

#### The Root Cause and Solution

The problem was a subtle conflict between my `vercel.json` file and Vercel's zero-configuration build system. The moment Vercel sees a `builds` property in `vercel.json`, it ignores its own automatic framework detection and *only* performs the builds you have explicitly defined. My configuration was correctly building the static site but was not correctly triggering the build for the serverless function.

The solution was to **delete the `vercel.json` file entirely** and configure the project directly in the Vercel dashboard.

1.  **Delete `vercel.json`:** This allows Vercel's build system to take over and apply its own logic.
2.  **Configure the Build in the Vercel Dashboard:**
    *   Go to your Project Settings -> General -> Build & Development Settings.
    *   Set **Framework Preset** to **Other**.
    *   Set the **Build Command** to `npm run build`.
    *   Set the **Output Directory** to `public`.

By doing this, Vercel's system correctly identifies two components: a static site that needs to be built with `npm run build`, and an `api` directory containing a serverless function that needs to be deployed. It handles the rest automatically, including the routing.

## Challenges and Considerations

- **Security:** This is paramount. The serverless function proxy pattern is the only recommended approach for handling API keys with a static site.
- **Theme Integration:** Getting the styling right is crucial for a seamless user experience. Always extend your theme's main template (`index.html` for `lightspeed`) and inspect its CSS to match the design.
- **Vercel Configuration:** For hybrid projects (static site + serverless functions), avoid using a `vercel.json` file with a `builds` property. Instead, configure your build command and output directory in the Vercel dashboard and let its zero-configuration system handle the rest. This is less error-prone and ensures all parts of your project are detected and deployed correctly.
- **Local Development vs. Production:** Features like serverless functions won't work with `zola serve`. Your development workflow must account for testing these features upon deployment to a platform like Vercel or Netlify.

## Conclusion

Adding a chat interface to a Zola static site is a creative way to blend static content with dynamic, AI-powered interactivity. By correctly handling template inheritance, styling, and API security with serverless functions, you can create a unique user experience that sets your site apart. If you're interested in seeing this in action, check out the [Chat with My Resume](/chat) page on my site.

Feel free to adapt this approach to your own Zola projects.
