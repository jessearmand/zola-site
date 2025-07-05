+++
title = "Enhancing Chat with Vector File Search: Adding Context to Resume Conversations"
date = 2025-07-05T14:30:00+08:00
tags = ["openai", "vector search", "file search", "chat", "AI", "LLM"]
+++

After implementing the [Chat with My Resume](/chat) feature on this site, I realized there was still room for improvement. While the chat could answer questions based on the resume data I fed it, it couldn't reference my actual blog posts or deeper content. That's where OpenAI's file search tool comes in handy—essentially giving the AI access to a knowledge base of all my writings.

## The Problem: Limited Context

The original chat implementation worked well for basic resume questions, but it had a fundamental limitation. The AI only knew about me based on the structured resume data I provided in the prompt. If someone asked "What are your thoughts on static site generators?" or "Tell me about your recent projects," the model couldn't reference the detailed blog posts I'd written on these topics.

This felt like a missed opportunity. I have some posts sitting in my `content/` directory, why not make that searchable too?

## The Solution: Vector File Search as a Secondary Tool

OpenAI's Responses API supports multiple tools working together. I was already using `web_search_preview` to give the model access to current information. Adding `file_search` as a secondary tool means the AI can now:

1. Search my uploaded blog posts and content
2. Pull relevant information from my actual writings
3. Provide more detailed, personalized responses based on my documented thoughts and experiences

The implementation is surprisingly straightforward once you have the vector store set up.

## Setting Up the File Search Pipeline

I created a Python script (`setup_file_search.py`) to handle the entire pipeline. The script is designed to be re-runnable without creating duplicates or wasting API calls.

Here's what the script does:

```python
def setup_file_search():
    client = OpenAI()

    # Step 0: Check what already exists
    existing_files = list_existing_files(client)
    existing_vector_stores = list_existing_vector_stores(client)

    # Step 1: Upload only new files
    file_ids = upload_files(client, existing_files)

    # Step 2: Reuse or create vector store
    vector_store = create_or_get_vector_store(client, "zola_posts", existing_vector_stores)

    # Step 3: Add files and wait for processing
    add_files_to_vector_store(client, vector_store.id, file_ids)

    # Step 4: Save config for the web app
    save_vector_store_config(vector_store.id)
```

The smart part is the duplicate detection. Before uploading anything, it checks:
- `client.files.list()` to see what files already exist
- `client.vector_stores.list()` to find existing vector stores
- `client.vector_stores.files.list()` to see what's already in the vector store

This means I can run the script repeatedly as I add new blog posts without worrying about duplicates or unnecessary API costs.

## Integrating with the Chat Proxy

The really elegant part is how this integrates with the existing chat proxy. I modified the `streamOpenaiWebSearch` function to conditionally add the file search tool:

```typescript
// Get vector store ID for file search
const vectorStoreId = getVectorStoreId();

// Build tools array - always include web search, add file search if available
const tools: Array<{
  type: "web_search_preview";
  search_context_size: "medium";
} | {
  type: "file_search";
  vector_store_ids: string[];
}> = [
  {
    type: "web_search_preview",
    search_context_size: "medium"
  }
];

if (vectorStoreId) {
  tools.push({
    type: "file_search",
    vector_store_ids: [vectorStoreId]
  });
}
```

This approach is graceful—if the vector store isn't configured, the chat still works with just web search. But when the vector store is available, the AI gets access to both my personal content and the broader web.

## The User Experience Improvement

From a user's perspective, the difference is subtle but significant. Questions like "What's your experience with Zola?" now get responses that reference specific blog posts I've written, complete with file citations. The AI can say things like "Based on your blog post about adding chat interfaces to Zola..." and actually quote relevant passages.

The file citations are particularly nice—they show up as annotations in the response, telling you exactly which blog post or content file the information came from. This adds credibility and lets users dive deeper into specific topics if they want.

## Implementation Notes

A few things I learned during implementation:

**File Filtering**: The script excludes `chat.md` and `_index.md` files since they don't contain meaningful content for search. Only the actual blog posts and pages get uploaded.

**Processing Time**: After uploading files to the vector store, there's a processing phase where OpenAI indexes them for search. The script polls the status until everything is marked as "completed."

**TypeScript Gotcha**: Adding the file search tool required proper TypeScript typing since the tools array now contains a union type. The explicit type annotation prevents the linter from complaining about unknown properties.

**Configuration Management**: I organized the vector store configuration in a `vector_store/` directory with both the JSON config and TypeScript helper functions, keeping things clean and reusable.

## The Result

Now when someone asks about my experience with specific technologies or approaches, the AI can pull from years of blog posts and documentation. It's like having a knowledgeable assistant who has actually read all my writing and can reference it contextually.

This is exactly the kind of enhancement that makes AI tools genuinely useful rather than just impressive demos. The combination of structured resume data, web search for current information, and file search for personal context creates a much richer conversational experience.

For anyone interested in the technical details, OpenAI's [file search documentation](https://platform.openai.com/docs/guides/tools-file-search) covers the API comprehensively. The key insight is that tools can work together—you don't have to choose between web search and file search. Use both.

It's another example of how the Responses API's tool-first approach makes complex integrations feel natural. Each tool handles what it's best at, and the model orchestrates them seamlessly.
