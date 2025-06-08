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
date = 2024-10-14T00:00:00+08:00
path = "chat"
template = "chat.html"
+++

This page allows you to ask questions about my resume using an AI chat interface powered by an LLM.
```

Note the `template = "chat.html"` which tells Zola to use a custom template for rendering this page.

### 2. Design a Custom Template for the Chat Interface

Next, I created a custom HTML template at `templates/chat.html` to define the structure of the chat interface. This template extends my base theme template and includes HTML for the chat UI and JavaScript for handling user input and API calls.

Here's a simplified version of the template:

- A container for displaying chat messages.
- An input field and send button for user queries.
- JavaScript to send requests to an LLM API and display responses.

Since Zola is a static site generator, the dynamic functionality (i.e., fetching AI responses) is handled client-side via JavaScript by calling an external API.

### 3. Set Up Client-Side Logic for AI Interaction

The JavaScript in the `chat.html` template handles user input and communicates with an LLM API. For my implementation, I used a placeholder for an API like Groq, which offers fast inference for AI models. The script includes hardcoded resume data (for simplicity) to provide context to the AI.

**Important Security Note:** Exposing API keys in client-side code is insecure. In a production environment, you should proxy requests through a backend service or use environment variables during a build step to avoid hardcoding sensitive information. For this demo, the API key placeholder must be replaced with a secure method.

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

After setting up the page and template, I tested the chat functionality locally using Zola's built-in server (`zola serve`). Once confirmed, I deployed the site to my hosting platform, ensuring the chat interface worked as expected in the live environment.

## Challenges and Considerations

- **Security:** As mentioned, client-side API calls can expose sensitive keys. A more robust solution would involve a serverless function or backend proxy to handle API requests securely.
- **Performance:** Since Zola generates static HTML, the chat relies on client-side JavaScript. Ensure the API calls are optimized to avoid slow response times.
- **Customization:** Tailor the resume data and AI prompts to provide accurate and relevant responses based on your content.

## Conclusion

Adding a chat interface to a Zola static site is a creative way to blend static content with dynamic, AI-powered interactivity. While it requires careful handling of security and performance aspects, the result is a unique user experience that can set your site apart. If you're interested in seeing this in action, check out the [Chat with My Resume](/chat) page on my site.

Feel free to adapt this approach to your own Zola projects, and let me know if you have questions or improvements!
