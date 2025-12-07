# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Build the Zola static site (downloads Zola binary on Linux/CI)
bun run build

# Type-check TypeScript serverless functions
bun run type-check

# Local development with Zola (requires zola installed)
zola serve

# Run Python file search test
cd file_search && python test_file_search.py

# Set up vector store for file search (uploads content to OpenAI)
cd file_search && python setup_file_search.py
```

## Architecture Overview

This is a Zola static site with an AI-powered chat feature deployed on Vercel.

### Core Components

**Static Site (Zola)**
- `config.toml` - Site configuration, theme settings, and feature flags
- `content/` - Markdown blog posts with TOML front matter (date-prefixed filenames)
- `templates/chat.html` - Custom template extending the theme for the chat page
- `themes/lightspeed/` - Git submodule theme with base templates (`index.html`, `page.html`)

**Serverless API (Vercel)**
- `api/chat-proxy.ts` - Vercel serverless function handling chat requests
  - Routes to either OpenAI (with web search + file search) or OpenRouter + x.ai
  - Streams SSE responses to the frontend
  - Reads resume context from `content/pages/about.md`
  - Controlled by `SEARCH_PROVIDER` env var (`openai_web_search` or `openrouter_xai`)

**Vector Store (OpenAI File Search)**
- `file_search/setup_file_search.py` - Uploads blog posts to OpenAI for RAG
- `vector_store/config.json` - Stores the vector store ID after setup
- `vector_store/vector-store-config.ts` - TypeScript module to read vector store config

### Data Flow

1. User submits question via `/chat` page
2. Frontend POSTs to `/api/chat-proxy`
3. API reads local resume markdown, calls OpenAI/OpenRouter with streaming
4. SSE chunks stream back, frontend parses and renders incrementally
5. Citations (web URLs or file references) collected and displayed

### Environment Variables (Vercel)

- `OPENAI_API_KEY` - Required for OpenAI web search and file search
- `SEARCH_PROVIDER` - `openai_web_search` (default) or `openrouter_xai`
- `OPENROUTER_API_KEY` - Required if using OpenRouter provider
- `XAI_API_KEY` - Optional, enables secondary x.ai live search

## Code Style

**TypeScript (`api/` directory)**
- ES modules with strict TypeScript
- `async/await` for all async operations
- JSDoc comments for public functions

**Python (`file_search/` directory)**
- Uses `uv` for package management (see `pyproject.toml`)
- Type hints, f-strings, PEP 8 naming

**Content**
- Markdown with TOML front matter (`+++` delimiters)
- Files named with date prefix: `YYYY-MM-DD-title.md`
